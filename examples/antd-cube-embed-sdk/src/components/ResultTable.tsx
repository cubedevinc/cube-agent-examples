import { useMemo, useState } from "react";
import { Table, Alert, Spin, Button, Space, Typography, Flex } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

import { prepareTableData, useReportContext } from "@cube-dev/embed-sdk";

const { Text } = Typography;

export function ResultTable() {
  const { report } = useReportContext();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const tableData = useMemo(() => {
    if (!report?.result?.data || !report?.result?.schema) {
      return { data: [], columns: [] };
    }

    return prepareTableData({
      data: report.result.data,
      schema: report.result.schema,
      logicalQuery: report.logicalQuery || undefined,
      columnWidths: null,
      columnFormats: null,
      columnOrder: null,
      useMemberTitles: true,
    });
  }, [report?.result, report?.logicalQuery]);

  const columns = useMemo(() => {
    return tableData.columns.map((col: any) => ({
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      ellipsis: true,
      width: 200,
      render: col.render
        ? (value: any) => col.render({ value })
        : (value: any) => String(value ?? ""),
    }));
  }, [tableData.columns]);

  const dataSource = useMemo(() => {
    return tableData.data.map((row: any, index: number) => ({
      ...row,
      key: row.key ?? index,
    }));
  }, [tableData.data]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return dataSource.slice(start, start + pageSize);
  }, [dataSource, page, pageSize]);

  const totalPages = Math.ceil(dataSource.length / pageSize);

  if (report?.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ padding: 32 }}>
        <Spin />
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Loading...
        </Text>
      </Flex>
    );
  }

  if (report?.error) {
    return (
      <Alert
        type="error"
        message="Query Error"
        description={report.error}
        showIcon
      />
    );
  }

  if (!report?.result || dataSource.length === 0) {
    return (
      <Flex align="center" justify="center" style={{ padding: 32 }}>
        <Text type="secondary">Run a query to see results</Text>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Table
        columns={columns}
        dataSource={paginatedData}
        pagination={false}
        size="small"
        bordered
      />
      <Flex align="center" justify="space-between">
        <Text type="secondary" style={{ fontSize: 14 }}>
          {dataSource.length} rows
        </Text>
        <Space>
          <Button
            size="small"
            icon={<LeftOutlined />}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          />
          <Text type="secondary" style={{ fontSize: 14 }}>
            Page {page + 1} of {totalPages || 1}
          </Text>
          <Button
            size="small"
            icon={<RightOutlined />}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          />
        </Space>
      </Flex>
    </Flex>
  );
}
