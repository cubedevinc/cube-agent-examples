import { useCallback, useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { Typography, Spin, Flex } from "antd";

import {
  EmbedProvider,
  createDefaultReport,
  Report,
} from "@cube-dev/embed-sdk";
import {
  embedPublicControllerGenerateSessionMutation,
  embedPublicControllerPostTokenBySessionIdMutation,
  deploymentsGetDeploymentOptions,
  deploymentsPublicControllerDeploymentTokenMutation,
} from "@cube-dev/console-public-sdk";
import { ReactLibExplorer } from "./components/ReactLibExplorer";

const { Title, Text } = Typography;

const apiKey = "sk-...";

const deploymentId = 51;
const EMBED_TOKEN_KEY = "cube_embed_token";
const REPORT_STORAGE_KEY = "cube_react_lib_report";

function loadReportFromStorage(): Report {
  try {
    const stored = localStorage.getItem(REPORT_STORAGE_KEY);
    if (stored) {
      return { ...createDefaultReport(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load report from storage:", e);
  }

  return createDefaultReport();
}

function saveReportToStorage(report: Report) {
  try {
    const { result, isLoading, error, ...persistable } = report;
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(persistable));
  } catch (e) {
    console.error("Failed to save report to storage:", e);
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expirationTime = payload.exp * 1000;
    return Date.now() >= expirationTime;
  } catch (error) {
    console.error("Error parsing token:", error);
    return true;
  }
}

const queryClient = new QueryClient();

function AppContent() {
  const [embedToken, setEmbedToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem(EMBED_TOKEN_KEY);
    if (storedToken && !isTokenExpired(storedToken)) {
      return storedToken;
    }

    return null;
  });

  const [report, setReport] = useState<Report>(loadReportFromStorage);

  const handleReportUpdate = useCallback((updates: Partial<Report>) => {
    setReport((prev: Report) => {
      const updated = { ...prev, ...updates };
      saveReportToStorage(updated);

      return updated;
    });
  }, []);

  // Should be done on backend only; this is just for testing purposes
  const generateSessionMutation = useMutation({
    ...embedPublicControllerGenerateSessionMutation({
      headers: {
        Authorization: `Api-Key ${apiKey}`,
      },
    }),
  });

  const getTokenMutation = useMutation({
    ...embedPublicControllerPostTokenBySessionIdMutation(),
    onSuccess(data) {
      if (data.token) {
        localStorage.setItem(EMBED_TOKEN_KEY, data.token);
        setEmbedToken(data.token);
      }
    },
  });

  // Fetch deployment info using embed token
  const { data: deployment } = useQuery({
    ...deploymentsGetDeploymentOptions({
      path: {
        deploymentId,
      },
      headers: embedToken
        ? {
            Authorization: `Embed-Token ${embedToken}`,
          }
        : undefined,
    }),
    enabled: !!embedToken,
  });

  // Fetch Cube API token using embed token
  const cubeApiTokenMutation = useMutation({
    ...deploymentsPublicControllerDeploymentTokenMutation({
      headers: embedToken
        ? {
            Authorization: `Embed-Token ${embedToken}`,
          }
        : undefined,
    }),
  });

  // Fetch Cube API token when embed token is available
  useEffect(() => {
    if (embedToken && deploymentId && !cubeApiTokenMutation.data) {
      cubeApiTokenMutation.mutate({
        path: {
          deploymentId,
        },
      });
    }
  }, [embedToken, deploymentId]);

  // Auto-generate session and token if not present or expired
  useEffect(() => {
    if (!embedToken && !generateSessionMutation.isPending) {
      generateSessionMutation.mutate({
        body: {
          deploymentId,
          externalId: "test@example.com",
          isEphemeral: true,
        },
      });
    }
  }, [embedToken, generateSessionMutation.isPending]);

  // Exchange session for token
  useEffect(() => {
    const sessionId = generateSessionMutation.data?.sessionId;
    if (sessionId) {
      getTokenMutation.mutate({
        body: {
          sessionId,
        },
      });
    }
  }, [generateSessionMutation.data?.sessionId]);

  const cubeApiUrl = deployment
    ? `${deployment.deploymentUrl}/cubejs-api/v1`
    : null;
  const cubeApiToken = cubeApiTokenMutation.data?.cubeApiToken || null;

  if (!cubeApiUrl || !cubeApiToken) {
    return (
      <Flex style={{ padding: 24 }}>
        <Spin>
          <Text type="secondary">Loading Cube API configuration...</Text>
        </Spin>
      </Flex>
    );
  }

  return (
    <EmbedProvider
      token={cubeApiToken}
      apiUrl={cubeApiUrl}
      report={report}
      onReportUpdate={handleReportUpdate}
      onError={console.error}
    >
      <Flex vertical style={{ padding: 24 }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          React Library Test
        </Title>
        <ReactLibExplorer />
      </Flex>
    </EmbedProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
