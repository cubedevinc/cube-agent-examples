import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Typography, Spin, Flex } from 'antd';

import {
  EmbedProvider,
  createDefaultReport,
  Report,
} from '@cube-dev/embed-sdk';
import { createCubeCloudApiClient } from '@cube-dev/console-public-sdk';
import {
  CubeCloudApiProvider,
  useCubeCloudApiMutation,
  useCubeCloudApiQuery,
} from '@cube-dev/console-public-sdk/react-query';
import { ReactLibExplorer } from './components/ReactLibExplorer';

const { Title, Text } = Typography;

const CLOUD_API_KEY = import.meta.env.VITE_API_KEY;
const DEPLOYMENT_ID = parseInt(import.meta.env.VITE_DEPLOYMENT_ID, 10);
const CLOUD_API_URL =
  import.meta.env.VITE_CLOUD_API_URL || 'https://tenant.cubecloud.dev';

const EMBED_TOKEN_KEY = 'cube_embed_token';
const REPORT_STORAGE_KEY = 'cube_react_lib_report';

function loadReportFromStorage(): Report {
  try {
    const stored = localStorage.getItem(REPORT_STORAGE_KEY);
    if (stored) {
      return { ...createDefaultReport(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load report from storage:', e);
  }

  return createDefaultReport();
}

function saveReportToStorage(report: Report) {
  try {
    const { result, isLoading, error, ...persistable } = report;
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(persistable));
  } catch (e) {
    console.error('Failed to save report to storage:', e);
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    return Date.now() >= expirationTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
}

const queryClient = new QueryClient();

function AppContent({ embedToken }: { embedToken: string }) {
  const [report, setReport] = useState<Report>(loadReportFromStorage);

  const handleReportUpdate = useCallback((updates: Partial<Report>) => {
    setReport((prev: Report) => {
      const updated = { ...prev, ...updates };
      saveReportToStorage(updated);

      return updated;
    });
  }, []);

  const { data: deployment } = useCubeCloudApiQuery(
    'get',
    '/api/v1/deployments/{deploymentId}',
    {
      params: {
        path: {
          deploymentId: DEPLOYMENT_ID,
        },
      },
      headers: {
        Authorization: `Embed-Token ${embedToken}`,
      },
    },
  );

  const cubeApiTokenMutation = useCubeCloudApiMutation(
    'post',
    '/api/v1/deployments/{deploymentId}/token',
  );

  useEffect(() => {
    if (embedToken && DEPLOYMENT_ID && !cubeApiTokenMutation.data) {
      cubeApiTokenMutation.mutate({
        params: {
          path: {
            deploymentId: DEPLOYMENT_ID,
          },
        },
        headers: {
          Authorization: `Embed-Token ${embedToken}`,
        },
      });
    }
  }, [embedToken]);

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
          Cube Embed SDK Example
        </Title>
        <ReactLibExplorer />
      </Flex>
    </EmbedProvider>
  );
}

function AuthFlow({
  onTokenReceived,
}: {
  onTokenReceived: (token: string) => void;
}) {
  const generateSessionMutation = useCubeCloudApiMutation(
    'post',
    '/api/v1/embed/generate-session',
  );

  const getTokenMutation = useCubeCloudApiMutation(
    'post',
    '/api/v1/embed/session/token',
    {
      onSuccess(data) {
        if (data.token) {
          localStorage.setItem(EMBED_TOKEN_KEY, data.token);
          onTokenReceived(data.token);
        }
      },
    },
  );

  useEffect(() => {
    if (!generateSessionMutation.isPending && !generateSessionMutation.data) {
      generateSessionMutation.mutate({
        headers: {
          Authorization: `Api-Key ${CLOUD_API_KEY}`,
        },
        body: {
          deploymentId: DEPLOYMENT_ID,
          externalId: 'test@example.com',
          isEphemeral: true,
        },
      });
    }
  }, [generateSessionMutation.isPending, generateSessionMutation.data]);

  useEffect(() => {
    const sessionId = generateSessionMutation.data?.sessionId;
    if (sessionId && !getTokenMutation.isPending && !getTokenMutation.data) {
      getTokenMutation.mutate({
        body: {
          sessionId,
        },
      });
    }
  }, [
    generateSessionMutation.data?.sessionId,
    getTokenMutation.isPending,
    getTokenMutation.data,
  ]);

  return (
    <Flex style={{ padding: 24 }}>
      <Spin>
        <Text type="secondary">Authenticating...</Text>
      </Spin>
    </Flex>
  );
}

export function App() {
  const [embedToken, setEmbedToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem(EMBED_TOKEN_KEY);
    if (storedToken && !isTokenExpired(storedToken)) {
      return storedToken;
    }

    return null;
  });

  const client = useMemo(
    () =>
      createCubeCloudApiClient({
        baseUrl: CLOUD_API_URL,
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CubeCloudApiProvider client={client}>
        {embedToken ? (
          <AppContent embedToken={embedToken} />
        ) : (
          <AuthFlow onTokenReceived={setEmbedToken} />
        )}
      </CubeCloudApiProvider>
    </QueryClientProvider>
  );
}
