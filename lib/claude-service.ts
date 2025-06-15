// Claude API service for screenshot analysis
export interface ScreenshotAnalysisResult {
  type: 'league_table' | 'team_stats' | 'player_stats' | 'unknown';
  confidence: number;
  data: LeagueTableData | TeamStatsData | PlayerStatsData | null;
  errors?: string[];
}

export interface LeagueTableData {
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
  gamesPlayed: number;
  form?: string;
}

export interface TeamStatsData {
  teamName: string;
  overallRating?: number;
  formation?: string;
  attackRating?: number;
  midfieldRating?: number;
  defenseRating?: number;
  season?: string;
}

export interface PlayerStatsData {
  players: Array<{
    name: string;
    position: string;
    rating: number;
    goals: number;
    assists: number;
    appearances: number;
    age?: number;
    nationality?: string;
  }>;
}

export class ClaudeVisionService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeScreenshot(imageData: string, imageType: string): Promise<ScreenshotAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt();
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageType,
                  data: imageData
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const analysisText = result.content[0].text;
      
      return this.parseAnalysisResult(analysisText);
    } catch (error) {
      console.error('Claude analysis error:', error);
      return {
        type: 'unknown',
        confidence: 0,
        data: null,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  private buildAnalysisPrompt(): string {
    return `
Analyze this FIFA/FC Career Mode screenshot and extract data in JSON format. 

First, identify what type of screenshot this is:
1. LEAGUE_TABLE: Shows league standings with team positions, points, wins, draws, losses, goals
2. TEAM_STATS: Shows team overall ratings, formation, attack/midfield/defense ratings  
3. PLAYER_STATS: Shows individual player statistics like goals, assists, appearances
4. UNKNOWN: Cannot clearly identify the screenshot type

Then extract the relevant data based on the type:

For LEAGUE_TABLE screenshots, extract:
- Your team's name (usually highlighted or marked differently)
- League name
- Current position in table
- Points, wins, draws, losses
- Goals for, goals against, goal difference
- Games played
- Recent form (if visible, like WWDLL)

For TEAM_STATS screenshots, extract:
- Team name
- Overall team rating
- Formation (like 4-3-3, 4-2-3-1)
- Attack, midfield, defense ratings if visible

For PLAYER_STATS screenshots, extract array of players with:
- Player name
- Position
- Overall rating
- Goals scored
- Assists
- Appearances/games played
- Age and nationality if visible

Respond in this exact JSON format:
{
  "type": "league_table|team_stats|player_stats|unknown",
  "confidence": 0.0-1.0,
  "data": { ... extracted data ... },
  "errors": ["any issues or unclear elements"]
}

Be conservative with confidence scores. Only give high confidence (>0.8) if the data is very clear and readable.
    `;
  }

  private parseAnalysisResult(analysisText: string): ScreenshotAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsed.type || !['league_table', 'team_stats', 'player_stats', 'unknown'].includes(parsed.type)) {
        throw new Error('Invalid screenshot type in response');
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.5; // Default confidence
      }

      return {
        type: parsed.type,
        confidence: parsed.confidence,
        data: parsed.data || null,
        errors: parsed.errors || []
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return {
        type: 'unknown',
        confidence: 0,
        data: null,
        errors: ['Failed to parse analysis result']
      };
    }
  }

  // Helper method to convert File to base64
  static async fileToBase64(file: File): Promise<{ data: string; type: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1]; // Remove data:image/png;base64, prefix
        resolve({
          data: base64Data,
          type: file.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Test method to validate API key
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Test connection'
          }]
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
