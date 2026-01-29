import { useState, useEffect } from "react";
import { Input, Select, Button, Space, Flex, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useDataAssetsContext } from "@cube-dev/embed-sdk";

const { Text } = Typography;

interface FilterItemProps {
  filter: {
    name: string;
    type: string;
    value?: any;
    memberType: string;
  };
  onFilterChange: (name: string, type: string, value: any) => void;
  onRemove: (name: string) => void;
}

const FILTER_TYPES = {
  string: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
    { value: "greater_than_or_equal", label: "greater than or equal" },
    { value: "less_than_or_equal", label: "less than or equal" },
  ],
  time: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "greater_than", label: "after" },
    { value: "less_than", label: "before" },
  ],
};

export function FilterItem({ filter, onFilterChange, onRemove }: FilterItemProps) {
  const { semanticViews } = useDataAssetsContext();

  const member = (semanticViews as any[])
    .flatMap((view: any) => [...(view.dimensions || []), ...(view.measures || [])])
    .find((m: any) => m.name === filter.name);

  const memberType = member?.type || "string";
  const filterTypes = FILTER_TYPES[memberType as keyof typeof FILTER_TYPES] || FILTER_TYPES.string;

  const displayValue = Array.isArray(filter.value) ? filter.value[0] || "" : filter.value || "";

  const [localValue, setLocalValue] = useState(displayValue);

  useEffect(() => {
    setLocalValue(displayValue);
  }, [displayValue]);

  const handleTypeChange = (newType: string) => {
    onFilterChange(filter.name, newType, filter.value);
  };

  const applyValue = () => {
    const valueToStore = filter.type === "equals" ? [localValue] : localValue;
    onFilterChange(filter.name, filter.type, valueToStore);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyValue();
    }
  };

  return (
    <Flex align="center">
      <Space.Compact>
        <Flex
          align="center"
          style={{
            padding: "4px 12px",
            backgroundColor: "#fafafa",
            border: "1px solid #d9d9d9",
            borderRadius: "6px 0 0 6px",
            whiteSpace: "nowrap",
          }}
        >
          <Text style={{ fontSize: 13 }}>
            {member?.title || filter.name}
          </Text>
        </Flex>
        <Select
          value={filter.type}
          onChange={handleTypeChange}
          options={filterTypes}
          style={{ width: 160 }}
          size="small"
        />
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={applyValue}
          onKeyDown={handleKeyDown}
          placeholder="Enter value"
          style={{ width: 200 }}
          size="small"
        />
      </Space.Compact>
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        onClick={() => onRemove(filter.name)}
        style={{ marginLeft: 4 }}
      />
    </Flex>
  );
}
