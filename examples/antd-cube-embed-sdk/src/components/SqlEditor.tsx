import { Input, Typography } from "antd";

import { useReportContext } from "@cube-dev/embed-sdk";

const { TextArea } = Input;
const { Text } = Typography;

export function SqlEditor() {
  const { report, updateReport } = useReportContext();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateReport({ sqlQuery: e.target.value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text strong style={{ fontSize: 14 }}>
        Semantic SQL
      </Text>
      <TextArea
        value={report?.sqlQuery || ""}
        placeholder="SELECT * FROM my_view"
        style={{
          minHeight: 120,
          fontFamily: "monospace",
          fontSize: 13,
          resize: "vertical",
        }}
        onChange={handleChange}
      />
    </div>
  );
}
