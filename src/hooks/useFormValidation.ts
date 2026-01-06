import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FieldValidationResult, ValidationResult } from '../utils/validation';

export interface UseFormValidationOptions<T> {
  validationRules: { [K in keyof T]?: (value: T[K], context?: T) => FieldValidationResult };
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface UseFormValidationResult<T> {
  errors: { [K in keyof T]?: string };
  warnings: { [K in keyof T]?: string };
  isValid: boolean;
  hasWarnings: boolean;
  isValidating: boolean;
  
  // Validation methods
  validateField: (fieldName: keyof T, value: T[keyof T], context?: T) => FieldValidationResult;
  validateAll: (data: T) => ValidationResult;
  clearFieldError: (fieldName: keyof T) => void;
  clearAllErrors: () => void;
  setFieldError: (fieldName: keyof T, error: string) => void;
  setFieldWarning: (fieldName: keyof T, warning: string) => void;
  
  // Field handlers
  getFieldProps: (fieldName: keyof T) => {
    onBlur?: (e: React.FocusEvent) => void;
    onChange?: (e: React.ChangeEvent) => void;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  };
}

export function useFormValidation<T extends Record<string, any>>(
  options: UseFormValidationOptions<T>
): UseFormValidationResult<T> {
  const {
    validationRules,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
  } = options;

  const [errors, setErrors] = useState<{ [K in keyof T]?: string }>({});
  const [warnings, setWarnings] = useState<{ [K in keyof T]?: string }>({});
  const [isValidating, setIsValidating] = useState(false);
  const [debounceTimers, setDebounceTimers] = useState<{ [K in keyof T]?: NodeJS.Timeout }>({});

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const hasWarnings = useMemo(() => {
    return Object.keys(warnings).length > 0;
  }, [warnings]);

  const validateField = useCallback((
    fieldName: keyof T,
    value: T[keyof T],
    context?: T
  ): FieldValidationResult => {
    const validator = validationRules[fieldName];
    if (!validator) {
      return { isValid: true };
    }
    return validator(value, context);
  }, [validationRules]);

  const validateAll = useCallback((data: T): ValidationResult => {
    const fieldErrors: { [K in keyof T]?: string } = {};
    const fieldWarnings: { [K in keyof T]?: string } = {};
    const errorMessages: string[] = [];
    const warningMessages: string[] = [];

    for (const [fieldName, validator] of Object.entries(validationRules)) {
      if (validator && typeof validator === 'function') {
        const result = validator(data[fieldName as keyof T], data);
        
        if (!result.isValid && result.error) {
          fieldErrors[fieldName as keyof T] = result.error;
          errorMessages.push(`${String(fieldName)}: ${result.error}`);
        }
        
        if (result.warning) {
          fieldWarnings[fieldName as keyof T] = result.warning;
          warningMessages.push(`${String(fieldName)}: ${result.warning}`);
        }
      }
    }

    setErrors(fieldErrors);
    setWarnings(fieldWarnings);

    const result: ValidationResult = {
      isValid: errorMessages.length === 0,
      errors: errorMessages,
    };

    if (warningMessages.length > 0) {
      result.warnings = warningMessages;
    }

    return result;
  }, [validationRules]);

  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    setWarnings(prev => {
      const newWarnings = { ...prev };
      delete newWarnings[fieldName];
      return newWarnings;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setWarnings({});
  }, []);

  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  const setFieldWarning = useCallback((fieldName: keyof T, warning: string) => {
    setWarnings(prev => ({ ...prev, [fieldName]: warning }));
  }, []);

  const validateFieldWithDebounce = useCallback((
    fieldName: keyof T,
    value: T[keyof T],
    context?: T
  ) => {
    // Clear existing timer for this field
    if (debounceTimers[fieldName]) {
      clearTimeout(debounceTimers[fieldName]);
    }

    // Set new timer
    const timer = setTimeout(() => {
      setIsValidating(true);
      const result = validateField(fieldName, value, context);
      
      if (!result.isValid && result.error) {
        setFieldError(fieldName, result.error);
      } else {
        clearFieldError(fieldName);
        if (result.warning) {
          setFieldWarning(fieldName, result.warning);
        }
      }
      
      setIsValidating(false);
      
      // Clean up timer reference
      setDebounceTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[fieldName];
        return newTimers;
      });
    }, debounceMs);

    setDebounceTimers(prev => ({ ...prev, [fieldName]: timer }));
  }, [debounceTimers, debounceMs, validateField, setFieldError, clearFieldError, setFieldWarning]);

  const getFieldProps = useCallback((fieldName: keyof T) => {
    const props: ReturnType<UseFormValidationResult<T>['getFieldProps']> = {
      'aria-invalid': !!errors[fieldName],
    };

    if (errors[fieldName]) {
      props['aria-describedby'] = `${String(fieldName)}-error`;
    }

    if (validateOnBlur) {
      props.onBlur = (e: React.FocusEvent) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
        validateFieldWithDebounce(fieldName, value as T[keyof T]);
      };
    }

    if (validateOnChange) {
      props.onChange = (e: React.ChangeEvent) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
        validateFieldWithDebounce(fieldName, value as T[keyof T]);
      };
    }

    return props;
  }, [errors, validateOnBlur, validateOnChange, validateFieldWithDebounce]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [debounceTimers]);

  return {
    errors,
    warnings,
    isValid,
    hasWarnings,
    isValidating,
    validateField,
    validateAll,
    clearFieldError,
    clearAllErrors,
    setFieldError,
    setFieldWarning,
    getFieldProps,
  };
}