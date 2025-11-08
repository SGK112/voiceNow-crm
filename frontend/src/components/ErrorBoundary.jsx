import { Component } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription>
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Error Details (Dev Mode):</h3>
                  <pre className="text-xs text-red-700 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-800 cursor-pointer">Component Stack</summary>
                      <pre className="text-xs text-red-700 mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset}>
                  Return to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
