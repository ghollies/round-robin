// Simple test to verify the algorithm works
const participants = [
  { id: 'p1', name: 'Player 1', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p2', name: 'Player 2', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p3', name: 'Player 3', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p4', name: 'Player 4', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } }
];

console.log('Testing algorithm with 4 players...');
console.log('Expected partnerships: C(4,2) = 6');
console.log('Expected rounds: 4-1 = 3');
console.log('Expected matches per round: 1 (2 partnerships per round, 1 match per 2 partnerships)');

// Test the algorithm logic manually
const allPartnerships = [];
for (let i = 0; i < participants.length; i++) {
  for (let j = i + 1; j < participants.length; j++) {
    allPartnerships.push({
      player1: participants[i],
      player2: participants[j],
      used: false
    });
  }
}

console.log('All partnerships:', allPartnerships.map(p => `${p.player1.name}-${p.player2.name}`));
console.log('Total partnerships:', allPartnerships.length);