import Dexie, { Table } from 'dexie';

// Define interfaces for our data structures
export interface Season {
  id?: number;
  name: string;
  startDate: Date;
  endDate?: Date;
  gameVersion: string; // FC24, FC25, etc.
  isActive: boolean;
  createdAt: Date;
}

export interface TeamSnapshot {
  id?: number;
  seasonId: number;
  timestamp: Date;
  teamName: string;
  league: string;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
  gamesPlayed: number;
}

export interface PlayerStats {
  id?: number;
  seasonId: number;
  teamSnapshotId?: number;
  timestamp: Date;
  playerName: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  appearances: number;
  age?: number;
  nationality?: string;
}

export interface ProcessedScreenshot {
  id?: number;
  filename: string;
  processedAt: Date;
  screenshotType: 'league_table' | 'team_stats' | 'player_stats';
  extractedData: any;
  confidence: number;
}

// Database class
export class CareerModeDB extends Dexie {
  seasons!: Table<Season>;
  teamSnapshots!: Table<TeamSnapshot>;
  playerStats!: Table<PlayerStats>;
  processedScreenshots!: Table<ProcessedScreenshot>;

  constructor() {
    super('CareerModeTracker');
    
    this.version(1).stores({
      seasons: '++id, name, startDate, gameVersion, isActive',
      teamSnapshots: '++id, seasonId, timestamp, teamName, league, position',
      playerStats: '++id, seasonId, teamSnapshotId, timestamp, playerName, position',
      processedScreenshots: '++id, filename, processedAt, screenshotType'
    });
  }
}

// Export singleton instance
export const db = new CareerModeDB();

// Helper functions for common operations
export const dbHelpers = {
  // Season management
  async createSeason(seasonData: Omit<Season, 'id' | 'createdAt'>): Promise<number> {
    // Set any existing active season to inactive
    await db.seasons.where('isActive').equals(true).modify({ isActive: false });
    
    return await db.seasons.add({
      ...seasonData,
      createdAt: new Date(),
    });
  },

  async getCurrentSeason(): Promise<Season | undefined> {
    return await db.seasons.where('isActive').equals(true).first();
  },

  async getAllSeasons(): Promise<Season[]> {
    return await db.seasons.orderBy('startDate').reverse().toArray();
  },

  // Team snapshot management
  async addTeamSnapshot(snapshotData: Omit<TeamSnapshot, 'id'>): Promise<number> {
    return await db.teamSnapshots.add(snapshotData);
  },

  async getTeamSnapshots(seasonId: number): Promise<TeamSnapshot[]> {
    return await db.teamSnapshots
      .where('seasonId')
      .equals(seasonId)
      .orderBy('timestamp')
      .toArray();
  },

  async getLatestTeamSnapshot(seasonId: number): Promise<TeamSnapshot | undefined> {
    return await db.teamSnapshots
      .where('seasonId')
      .equals(seasonId)
      .orderBy('timestamp')
      .last();
  },

  // Player stats management
  async addPlayerStats(playerData: Omit<PlayerStats, 'id'>[]): Promise<number[]> {
    return await db.playerStats.bulkAdd(playerData, { allKeys: true });
  },

  async getPlayerStats(seasonId: number): Promise<PlayerStats[]> {
    return await db.playerStats
      .where('seasonId')
      .equals(seasonId)
      .orderBy('timestamp')
      .toArray();
  },

  // Progress tracking
  async getProgressData(seasonId: number) {
    const snapshots = await this.getTeamSnapshots(seasonId);
    const playerStats = await this.getPlayerStats(seasonId);
    
    return {
      teamProgress: snapshots.map(snapshot => ({
        date: snapshot.timestamp,
        position: snapshot.position,
        points: snapshot.points,
        goalsFor: snapshot.goalsFor,
        goalsAgainst: snapshot.goalsAgainst
      })),
      topScorers: playerStats
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 10),
      topAssists: playerStats
        .filter(p => p.assists > 0)
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 10)
    };
  },

  // Screenshot tracking to avoid duplicates
  async markScreenshotProcessed(filename: string, type: ProcessedScreenshot['screenshotType'], data: any, confidence: number): Promise<number> {
    return await db.processedScreenshots.add({
      filename,
      processedAt: new Date(),
      screenshotType: type,
      extractedData: data,
      confidence
    });
  },

  async isScreenshotProcessed(filename: string): Promise<boolean> {
    const count = await db.processedScreenshots.where('filename').equals(filename).count();
    return count > 0;
  },

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    await db.transaction('rw', db.seasons, db.teamSnapshots, db.playerStats, db.processedScreenshots, async () => {
      await db.seasons.clear();
      await db.teamSnapshots.clear();
      await db.playerStats.clear();
      await db.processedScreenshots.clear();
    });
  },

  async exportData(): Promise<object> {
    const [seasons, teamSnapshots, playerStats] = await Promise.all([
      db.seasons.toArray(),
      db.teamSnapshots.toArray(),
      db.playerStats.toArray()
    ]);

    return {
      exportDate: new Date().toISOString(),
      seasons,
      teamSnapshots,
      playerStats
    };
  }
};
