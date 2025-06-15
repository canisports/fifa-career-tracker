import React, { useState, useCallback } from 'react';
import { Upload, X, Image, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { ClaudeVisionService, ScreenshotAnalysisResult } from '../lib/claude-service';
import { dbHelpers } from '../lib/database';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface ProcessingResult {
  fileId: string;
  result: ScreenshotAnalysisResult;
  processed: boolean;
}

interface ScreenshotUploadProps {
  onDataExtracted?: (results: ProcessingResult[]) => void;
  claudeApiKey?: string;
}

export default function ScreenshotUpload({ onDataExtracted, claudeApiKey }: ScreenshotUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle dropped files
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  // Process uploaded files
  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
  };

  // Remove uploaded file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
    setProcessingResults(prev => prev.filter(r => r.fileId !== fileId));
  };

  // Process screenshots with Claude
  const processScreenshots = async () => {
    if (!claudeApiKey) {
      alert('Please provide a Claude API key to process screenshots');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Please upload at least one screenshot');
      return;
    }

    setIsProcessing(true);
    const claude = new ClaudeVisionService(claudeApiKey);
    const results: ProcessingResult[] = [];

    try {
      for (const uploadedFile of uploadedFiles) {
        // Check if already processed
        const isAlreadyProcessed = await dbHelpers.isScreenshotProcessed(uploadedFile.file.name);
        if (isAlreadyProcessed) {
          results.push({
            fileId: uploadedFile.id,
            result: {
              type: 'unknown',
              confidence: 0,
              data: null,
              errors: ['Screenshot already processed']
            },
            processed: false
          });
          continue;
        }

        // Convert to base64 and analyze
        const { data, type } = await ClaudeVisionService.fileToBase64(uploadedFile.file);
        const analysisResult = await claude.analyzeScreenshot(data, type);
        
        // Store result
        results.push({
          fileId: uploadedFile.id,
          result: analysisResult,
          processed: true
        });

        // Save to database if successful
        if (analysisResult.confidence > 0.3 && analysisResult.data) {
          await saveExtractedData(analysisResult);
          await dbHelpers.markScreenshotProcessed(
            uploadedFile.file.name,
            analysisResult.type,
            analysisResult.data,
            analysisResult.confidence
          );
        }
      }

      setProcessingResults(results);
      onDataExtracted?.(results);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Error processing screenshots. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save extracted data to database
  const saveExtractedData = async (result: ScreenshotAnalysisResult) => {
    try {
      // Get or create current season
      let currentSeason = await dbHelpers.getCurrentSeason();
      if (!currentSeason) {
        const seasonId = await dbHelpers.createSeason({
          name: `Season ${new Date().getFullYear()}`,
          startDate: new Date(),
          gameVersion: 'FC25', // Default, user can change later
          isActive: true
        });
        currentSeason = await dbHelpers.getCurrentSeason();
      }

      if (!currentSeason) return;

      const timestamp = new Date();

      // Save based on data type
      if (result.type === 'league_table' && result.data) {
        const leagueData = result.data as any;
        await dbHelpers.addTeamSnapshot({
          seasonId: currentSeason.id!,
          timestamp,
          teamName: leagueData.teamName || 'Unknown Team',
          league: leagueData.league || 'Unknown League',
          position: leagueData.position || 0,
          points: leagueData.points || 0,
          wins: leagueData.wins || 0,
          draws: leagueData.draws || 0,
          losses: leagueData.losses || 0,
          goalsFor: leagueData.goalsFor || 0,
          goalsAgainst: leagueData.goalsAgainst || 0,
          goalDifference: leagueData.goalDifference || 0,
          gamesPlayed: leagueData.gamesPlayed || 0,
          form: leagueData.form
        });
      } else if (result.type === 'player_stats' && result.data) {
        const playerData = result.data as any;
        if (playerData.players && Array.isArray(playerData.players)) {
          const playerStats = playerData.players.map((player: any) => ({
            seasonId: currentSeason!.id!,
            timestamp,
            playerName: player.name || 'Unknown Player',
            position: player.position || 'Unknown',
            rating: player.rating || 0,
            goals: player.goals || 0,
            assists: player.assists || 0,
            appearances: player.appearances || 0,
            age: player.age,
            nationality: player.nationality
          }));
          await dbHelpers.addPlayerStats(playerStats);
        }
      }
    } catch (error) {
      console.error('Error saving extracted data:', error);
    }
  };

  // Get result status for display
  const getResultStatus = (result: ScreenshotAnalysisResult) => {
    if (result.confidence > 0.7) return { color: 'text-green-600', icon: CheckCircle, text: 'High confidence' };
    if (result.confidence > 0.4) return { color: 'text-yellow-600', icon: AlertCircle, text: 'Medium confidence' };
    return { color: 'text-red-600', icon: AlertCircle, text: 'Low confidence' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-xl font-medium text-gray-700">
              Upload Career Mode Screenshots
            </p>
            <p className="text-gray-500 mt-2">
              Drag and drop or click to select league tables, team stats, or player stats
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Supports PNG, JPG, JPEG up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Uploaded Screenshots ({uploadedFiles.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((uploadedFile) => {
              const result = processingResults.find(r => r.fileId === uploadedFile.id);
              const status = result?.result ? getResultStatus(result.result) : null;
              
              return (
                <div key={uploadedFile.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={uploadedFile.preview}
                      alt="Screenshot preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  
                  {/* Processing status */}
                  {status && (
                    <div className={`absolute bottom-2 left-2 right-2 bg-white rounded px-2 py-1 text-xs ${status.color} flex items-center gap-1`}>
                      <status.icon className="h-3 w-3" />
                      <span className="truncate">{status.text}</span>
                    </div>
                  )}
                  
                  {/* File name */}
                  <p className="mt-2 text-sm text-gray-600 truncate" title={uploadedFile.file.name}>
                    {uploadedFile.file.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Process Button */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={processScreenshots}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Processing Screenshots...
              </>
            ) : (
              <>
                <Image className="h-5 w-5" />
                Analyze Screenshots ({uploadedFiles.length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Processing Results */}
      {processingResults.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">Processing Results</h3>
          {processingResults.map((result) => {
            const uploadedFile = uploadedFiles.find(f => f.id === result.fileId);
            const status = getResultStatus(result.result);
            
            return (
              <div key={result.fileId} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium truncate">{uploadedFile?.file.name}</span>
                  <div className={`flex items-center gap-1 ${status.color}`}>
                    <status.icon className="h-4 w-4" />
                    <span className="text-sm">{status.text}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Type:</strong> {result.result.type.replace('_', ' ').toUpperCase()}</div>
                  <div><strong>Confidence:</strong> {(result.result.confidence * 100).toFixed(1)}%</div>
                  
                  {result.result.data && (
                    <div className="mt-2">
                      <strong>Extracted Data:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.result.errors && result.result.errors.length > 0 && (
                    <div className="mt-2">
                      <strong className="text-red-600">Errors:</strong>
                      <ul className="list-disc list-inside text-red-600 text-xs mt-1">
                        {result.result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
