import { useState, useMemo, useRef } from "react";
import { Button, Segmented, Space, Typography, Flex } from "antd";
import { PlayCircleOutlined, LoadingOutlined } from "@ant-design/icons";

import {
  useReportContext,
  canApplyTemplate,
  applyChartTemplate,
  blankVegaSpec,
  VegaChart,
  VegaChartTemplateType,
  useChartBuilderContext,
} from "@cube-dev/embed-sdk";

import { DataAssetPanel } from "./DataAssetPanel";
import { ResultTable } from "./ResultTable";
import { SqlEditor } from "./SqlEditor";
import { FilterItem } from "./FilterItem";

const { Text } = Typography;

type ViewMode = "results" | "chart";

const CHART_TYPES: { type: VegaChartTemplateType; label: string }[] = [
  { type: "grouped_bar", label: "Grouped Bar" },
  { type: "stacked_bar", label: "Stacked Bar" },
  { type: "percent_stacked_bar", label: "% Stacked Bar" },
  { type: "horizontal_grouped_bar", label: "Horizontal Grouped Bar" },
  { type: "horizontal_stacked_bar", label: "Horizontal Stacked Bar" },
  { type: "percent_horizontal_stacked_bar", label: "% Horizontal Stacked Bar" },
  { type: "line", label: "Line" },
  { type: "area", label: "Area" },
  { type: "scatter", label: "Scatter" },
  { type: "heatmap", label: "Heatmap" },
  { type: "arc", label: "Pie" },
  { type: "boxplot", label: "Boxplot" },
];

export function ReactLibExplorer() {
  const { report, runQuery, updateLogicalQueryAndRunQuery, selectedSemanticView } = useReportContext();
  const [viewMode, setViewMode] = useState<ViewMode>("results");
  const [selectedChartType, setSelectedChartType] =
    useState<VegaChartTemplateType | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleRun = () => {
    runQuery(report?.sqlQuery, true);
  };

  const handleFilterChange = (name: string, type: string, value: any) => {
    if (!selectedSemanticView) return;

    const currentFilters = report?.logicalQuery?.filters || [];
    const otherFilters = currentFilters.filter((f: any) => f.name !== name);
    const updatedFilters = [
      ...otherFilters,
      { name, type, value, memberType: "dimension" },
    ];

    updateLogicalQueryAndRunQuery({
      semanticView: selectedSemanticView,
      filters: updatedFilters,
    });
  };

  const handleRemoveFilter = (name: string) => {
    if (!selectedSemanticView) return;

    const currentFilters = report?.logicalQuery?.filters || [];
    const updatedFilters = currentFilters.filter((f: any) => f.name !== name);

    updateLogicalQueryAndRunQuery({
      semanticView: selectedSemanticView,
      filters: updatedFilters,
    });
  };

  const { chartColumns } = useChartBuilderContext();

  // Filter available chart types based on current data
  const availableChartTypes = useMemo(() => {
    return CHART_TYPES.filter(({ type }) =>
      canApplyTemplate(type, chartColumns)
    );
  }, [chartColumns]);

  // Generate vega spec for selected chart type
  const vegaSpec = useMemo(() => {
    if (!selectedChartType || chartColumns.length === 0) {
      return null;
    }

    return applyChartTemplate(
      selectedChartType,
      blankVegaSpec as any,
      chartColumns
    );
  }, [selectedChartType, chartColumns]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 16,
        width: "100%",
      }}
    >
      <DataAssetPanel />

      <Flex vertical gap={12}>
        <Space>
          <Button
            type="primary"
            icon={
              report?.isLoading ? <LoadingOutlined /> : <PlayCircleOutlined />
            }
            onClick={handleRun}
            disabled={!report?.sqlQuery || report?.isLoading}
          >
            Run
          </Button>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { label: "Results", value: "results" },
              { label: "Chart", value: "chart" },
            ]}
          />
        </Space>

        <SqlEditor />

        {report?.logicalQuery?.filters && report.logicalQuery.filters.length > 0 && (
          <Flex vertical gap={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>Filters:</Text>
            <Space wrap size={8}>
              {report.logicalQuery.filters.map((filter: any, index: number) => (
                <FilterItem
                  key={`${filter.name}-${index}`}
                  filter={filter}
                  onFilterChange={handleFilterChange}
                  onRemove={handleRemoveFilter}
                />
              ))}
            </Space>
          </Flex>
        )}

        {viewMode === "results" ? (
          <ResultTable />
        ) : (
          <Flex vertical gap={12}>
            <Space wrap>
              {availableChartTypes.map(({ type, label }) => (
                <Button
                  key={type}
                  size="small"
                  type={selectedChartType === type ? "primary" : "default"}
                  onClick={() => setSelectedChartType(type)}
                >
                  {label}
                </Button>
              ))}
              {availableChartTypes.length === 0 && (
                <Text type="secondary">
                  Run a query to see available chart types
                </Text>
              )}
            </Space>
            {selectedChartType && vegaSpec && report?.result?.data && (
              <Flex
                ref={chartContainerRef}
                style={{
                  height: 400,
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                }}
              >
                <VegaChart
                  data={report.result.data}
                  schema={chartColumns}
                  vegaSpecProp={vegaSpec}
                  isLoading={report?.isLoading}
                  containerRef={chartContainerRef}
                />
              </Flex>
            )}
          </Flex>
        )}
      </Flex>
    </div>
  );
}
