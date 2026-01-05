// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfills for Node.js test environment
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder and TextDecoder to global scope for jsPDF compatibility
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock jsPDF and html2canvas for all tests
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
  }));
});

jest.mock('html2canvas', () => {
  return jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
    height: 800,
    width: 600,
  });
});

// Mock window.alert for all tests
global.alert = jest.fn();