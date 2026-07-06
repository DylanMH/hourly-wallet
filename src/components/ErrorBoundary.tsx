import React, { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { captureException } from "@/lib/sentry";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

export type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary", error, errorInfo);
    captureException(error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error?: Error;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Card>
        <Text style={[typography.heading, { color: colors.danger }]}>
          Something went wrong
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>
          The app hit an unexpected error. You can try reloading the screen.
        </Text>
        {error ? (
          <Text
            style={[
              styles.error,
              typography.caption,
              { color: colors.textMuted },
            ]}
            numberOfLines={6}
          >
            {error.message}
          </Text>
        ) : null}
        <Button label="Try again" onPress={onReset} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  error: {
    marginVertical: spacing.sm,
  },
});
