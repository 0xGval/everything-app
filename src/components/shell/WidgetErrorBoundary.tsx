import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  widgetName: string;
  onRemove: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `[WidgetErrorBoundary] "${this.props.widgetName}" crashed:`,
      error,
      errorInfo.componentStack,
    );
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <AlertTriangle className="h-8 w-8 text-destructive/70" />
          <p className="text-center text-xs font-medium">
            {this.props.widgetName} encountered an error
          </p>
          <p className="max-w-full truncate text-center text-[10px] text-muted-foreground">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={this.handleReload}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={this.props.onRemove}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
