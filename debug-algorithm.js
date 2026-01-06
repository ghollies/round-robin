// Debug the 5-player algorithm
const participants = [
  { id: 'p1', name: 'Player 1', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p2', name: 'Player 2', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p3', name: 'Player 3', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p4', name: 'Player 4', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } },
  { id: 'p5', name: 'Player 5', tournamentId: 'test', statistics: { gamesWon: 0, gamesLost: 0, totalPointsScored: 0, totalPointsAllowed: 0, pointDifferential: 0 } }
];

console.log('5 players:');
console.log('Total partnerships: C(5,2) = 10');
console.log('Required rounds: 5');
console.log('Active players per round: 4');
console.log('Partnerships per round: 2');
console.log('Matches per round: 1 (2 partnerships = 1 match)');

// List all partnerships
const allPartnerships = [];
for (let i = 0; i < participants.length; i++) {
  for (let j = i + 1; j < participants.length; j++) {
    allPartnerships.push(`${participants[i].name}-${participants[j].name}`);
  }
}

console.log('All partnerships:', allPartnerships);
console.log('Total:', allPartnerships.length);

// Simulate round generation
for (let round = 0; round < 5; round++) {
  const byePlayerIndex = round % 5;
  const byePlayer = participants[byePlayerIndex];
  const activePlayers = participants.filter((_, index) => index !== byePlayerIndex);
  
  console.log(`\nRound ${round + 1}:`);
  console.log(`Bye player: ${byePlayer.name}`);
  console.log(`Active players: ${activePlayers.map(p => p.name).join(', ')}`);
  console.log(`Active count: ${activePlayers.length}`);
  console.log(`Should generate ${activePlayers.length / 2} partnerships`);
}