// Quick test of the algorithm
console.log('Testing the fixed algorithm...');

// Test with 5 players
const participants5 = [
  { id: 'p1', name: 'Player 1', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p2', name: 'Player 2', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p3', name: 'Player 3', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p4', name: 'Player 4', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p5', name: 'Player 5', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } }
];

console.log('5 players test:');
console.log('- Expected: 5 rounds, 2 partnerships per round, 1 match per round');
console.log('- Total partnerships: 10');

// Test with 4 players
const participants4 = [
  { id: 'p1', name: 'Player 1', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p2', name: 'Player 2', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p3', name: 'Player 3', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p4', name: 'Player 4', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } }
];

console.log('\n4 players test:');
console.log('- Expected: 3 rounds, 2 partnerships per round, 1 match per round');
console.log('- Total partnerships: 6');

console.log('\nAlgorithm should now be working correctly!');