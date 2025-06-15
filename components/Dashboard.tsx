import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Target, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Season, TeamSnapshot, PlayerStats, dbHelpers, db } from '../lib/database';

interface DashboardProps {
  refreshTrigger?: number;
}

interface ProgressData {
  teamProgress: Array<{
    date: Date;
    position: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
  topScorers: PlayerStats[];
  topAssists: PlayerStats[];
}

export default function Dashboard({ refreshTrigger }: DashboardProps) {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<TeamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from database
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current season and all seasons
      const [current, seasons] = await Promise.all([
        dbHelpers.getCurrentSeason(),
        dbHelpers.getAllSeasons()
      ]);
      
      setCurrentSeason(current || null);
      setAllSeasons(seasons);
      
      if (current) {
        // Get progress data and latest snapshot
        const [progress, latest] = await Promise.all([
          dbHelpers.getProgressData(current.id!),
          dbHelpers.getLatestTeamSnapshot(current.id!)
        ]);
        
        setProgressData(progress);
        setLatestSnapshot(latest || null);
      } else {
        setProgressData(null);
        setLatestSnapshot(null);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Create new season
  const createNewSeason = async () => {
    const seasonName = prompt('Enter season name:');
    if (!seasonName) return;

    try {
      await dbHelpers.createSeason({
        name: seasonName,
        startDate: new Date(),
        gameVersion: 'FC25',
        isActive: true
      });
      await loadData();
    } catch (error) {
      console.error('Error creating season:', error);
      alert('Failed to create season');
    }
  };

  // Switch active season
  const switchSeason = async (seasonId: number) => {
    try {
      // Set all seasons to inactive
      await Promise.all(
        allSeasons.map(async season => {
          if (season.id) {
            await db.seasons.update(season.id, { isActive: false });
          }
        })
      );
      
      // Set selected season as active
      await db.seasons.update(seasonId, { isActive: true });
      await loadData();
    } catch (error) {
      console.error('Error switching season:', error);
      alert('Failed to switch season');
    }
  };

  // Format chart data for position tracking
  const formatPositionData = () => {
    if (!progressData?.teamProgress) return [];
    
    return progressData.teamProgress.map(snapshot => ({
      date: snapshot.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      position: snapshot.position,
      points: snapshot.points
    }));
  };

  // Format chart data for goals tracking
  const formatGoalsData = () => {
    if (!progressData?.teamProgress) return [];
    
    return progressData.teamProgress.map(snapshot => ({
      date: snapshot.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      goalsFor: snapshot.goalsFor,
      goalsAgainst: snapshot.goalsAgainst
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">No Active Season</h2>
        <p className="text-gray-500 mb-6">Create your first season to start tracking your career mode progress.</p>
        <button
          onClick={createNewSeason}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Create New Season
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentSeason.name}</h1>
            <p className="text-gray-500">
              Started: {currentSeason.startDate.toLocaleDateString()} • {currentSeason.gameVersion}
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={currentSeason.id}
              onChange={(e) => switchSeason(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {allSeasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
            <button
              onClick={createNewSeason}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              New Season
            </button>
          </div>
        </div>
      </div>

      {/* Current Stats Cards */}
      {latestSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">League Position</p>
                <p className="text-3xl font-bold text-gray-900">#{latestSnapshot.position}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-600 mt-2">{latestSnapshot.league}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Points</p>
                <p className="text-3xl font-bold text-gray-900">{latestSnapshot.points}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {latestSnapshot.wins}W {latestSnapshot.draws}D {latestSnapshot.losses}L
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Goals For</p>
                <p className="text-3xl font-bold text-green-600">{latestSnapshot.goalsFor}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {latestSnapshot.goalsAgainst} conceded
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Goal Difference</p>
                <p className={`text-3xl font-bold ${latestSnapshot.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {latestSnapshot.goalDifference >= 0 ? '+' : ''}{latestSnapshot.goalDifference}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {latestSnapshot.gamesPlayed} games played
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {progressData && progressData.teamProgress.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* League Position Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">League Position Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatPositionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 20]} reversed />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="position" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Goals Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Goals Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formatGoalsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="goalsFor" fill="#10B981" name="Goals For" />
                <Bar dataKey="goalsAgainst" fill="#EF4444" name="Goals Against" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Player Stats */}
      {progressData && (progressData.topScorers.length > 0 || progressData.topAssists.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Scorers */}
          {progressData.topScorers.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Scorers
              </h3>
              <div className="space-y-3">
                {progressData.topScorers.slice(0, 5).map((player, index) => (
                  <div key={`${player.playerName}-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{player.playerName}</p>
                        <p className="text-sm text-gray-500">{player.position}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{player.goals}</p>
                      <p className="text-sm text-gray-500">goals</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Assists */}
          {progressData.topAssists.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Assists
              </h3>
              <div className="space-y-3">
                {progressData.topAssists.slice(0, 5).map((player, index) => (
                  <div key={`${player.playerName}-assists-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{player.playerName}</p>
                        <p className="text-sm text-gray-500">{player.position}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{player.assists}</p>
                      <p className="text-sm text-gray-500">assists</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Data State */}
      {(!progressData || progressData.teamProgress.length === 0) && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Data Yet</h3>
          <p className="text-gray-500">
            Upload some screenshots to start tracking your career mode progress!
          </p>
        </div>
      )}
    </div>
  );
}
