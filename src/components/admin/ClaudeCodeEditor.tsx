import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  Sparkles, Loader2, Send, Check, X, AlertTriangle,
  Code, FileCode, GitCommit, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface FileChange {
  path: string;
  action: 'modify' | 'create' | 'delete';
  searchReplace?: Array<{ search: string; replace: string }>;
  fullContent?: string;
}

interface CodeChangeResponse {
  success: boolean;
  explanation: string;
  changes: FileChange[];
  warnings: string[];
  canAutoApply: boolean;
  error?: string;
}

export const ClaudeCodeEditor: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [response, setResponse] = useState<CodeChangeResponse | null>(null);
  const [showDiff, setShowDiff] = useState<Record<number, boolean>>({});

  const analyzeChange = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsAnalyzing(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('claude-code-editor', {
        body: { prompt }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setResponse({ ...data, success: false });
      } else {
        setResponse(data);
        toast.success('Analysis complete! Review the suggested changes.');
      }
    } catch (err) {
      console.error('Error analyzing change:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to analyze change');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyChanges = async () => {
    if (!response?.changes || response.changes.length === 0) {
      toast.error('No changes to apply');
      return;
    }

    setIsApplying(true);

    try {
      const { data, error } = await supabase.functions.invoke('apply-code-changes', {
        body: {
          changes: response.changes,
          commitMessage: `[AI] ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Changes applied successfully! Vercel will auto-deploy.');
        setPrompt('');
        setResponse(null);
      } else {
        toast.error('Some changes failed to apply');
        console.error('Apply results:', data.results);
      }
    } catch (err) {
      console.error('Error applying changes:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleDiff = (index: number) => {
    setShowDiff(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const examplePrompts = [
    "Hide the material store link in the navbar",
    "Change the primary color to dark blue (#1a365d)",
    "Add a new service called 'Emergency Response' with description 'Rapid 24/7 emergency services'",
    "Update the phone number to (555) 123-4567",
    "Add a new FAQ: 'Do you offer financing?' with answer 'Yes, we offer flexible payment plans'",
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Code Editor
        </CardTitle>
        <CardDescription>
          Describe changes in natural language and Claude will generate the code modifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Describe the change you want to make... e.g., 'Hide the material store in the navbar' or 'Change the primary color to navy blue'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isAnalyzing || isApplying}
          />
          <div className="flex flex-wrap gap-2">
            {examplePrompts.slice(0, 3).map((example, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setPrompt(example)}
              >
                {example.slice(0, 40)}...
              </Badge>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={analyzeChange}
          disabled={isAnalyzing || isApplying || !prompt.trim()}
          className="w-full sm:w-auto"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Analyze Change
            </>
          )}
        </Button>

        {/* Response */}
        {response && (
          <div className="space-y-4">
            {/* Explanation */}
            {response.explanation && (
              <Alert>
                <Code className="w-4 h-4" />
                <AlertTitle>Proposed Changes</AlertTitle>
                <AlertDescription>{response.explanation}</AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {response.warnings && response.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {response.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* File Changes */}
            {response.changes && response.changes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Files to Change ({response.changes.length})
                </h4>
                {response.changes.map((change, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          change.action === 'create' ? 'default' :
                          change.action === 'delete' ? 'destructive' : 'secondary'
                        }>
                          {change.action}
                        </Badge>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {change.path}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDiff(index)}
                      >
                        {showDiff[index] ? (
                          <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-1" /> Show</>
                        )}
                      </Button>
                    </div>

                    {showDiff[index] && (
                      <div className="mt-3 space-y-2">
                        {change.searchReplace?.map((sr, srIndex) => (
                          <div key={srIndex} className="text-xs font-mono">
                            <div className="bg-red-500/10 p-2 rounded-t border-l-2 border-red-500">
                              <span className="text-red-600">- {sr.search.slice(0, 200)}{sr.search.length > 200 ? '...' : ''}</span>
                            </div>
                            <div className="bg-green-500/10 p-2 rounded-b border-l-2 border-green-500">
                              <span className="text-green-600">+ {sr.replace.slice(0, 200)}{sr.replace.length > 200 ? '...' : ''}</span>
                            </div>
                          </div>
                        ))}
                        {change.fullContent && (
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                            {change.fullContent.slice(0, 1000)}
                            {change.fullContent.length > 1000 ? '\n...(truncated)' : ''}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Apply Button */}
            {response.changes && response.changes.length > 0 && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={applyChanges}
                  disabled={isApplying || !response.canAutoApply}
                  className="flex-1"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <GitCommit className="w-4 h-4 mr-2" />
                      Apply Changes to GitHub
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResponse(null)}
                  disabled={isApplying}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}

            {!response.canAutoApply && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>GitHub Token Required</AlertTitle>
                <AlertDescription>
                  Add GITHUB_TOKEN to Supabase secrets to enable auto-apply.
                  For now, you can manually copy the changes.
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {response.error && (
              <Alert variant="destructive">
                <X className="w-4 h-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{response.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaudeCodeEditor;
