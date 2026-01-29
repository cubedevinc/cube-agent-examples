import { useCallback, useMemo } from 'react';
import { Button, Collapse, Tag, Typography, Flex, Card } from 'antd';
import {
  TableOutlined,
  NumberOutlined,
  FontSizeOutlined,
  CloseOutlined,
  CheckOutlined,
  FilterOutlined,
} from '@ant-design/icons';

import { useDataAssetsContext, useReportContext } from '@cube-dev/embed-sdk';

const { Text } = Typography;

interface SemanticView {
  name: string;
  title?: string;
  dimensions?: Array<{
    name: string;
    title?: string;
    type?: string;
    aliasMember?: string;
  }>;
  measures?: Array<{
    name: string;
    title?: string;
    type?: string;
    aliasMember?: string;
  }>;
}

type MemberType = 'dimension' | 'measure';

interface Member {
  name: string;
  title?: string;
  type?: string;
  memberType: MemberType;
  aliasMember?: string;
  isSelected?: boolean;
  hasFilter?: boolean;
}

interface MembersByCube {
  [cubeName: string]: Member[];
}

function getMemberIcon(member: Member) {
  if (member.memberType === 'measure') {
    return <NumberOutlined style={{ color: '#722ed1', fontSize: 12 }} />;
  }

  return <FontSizeOutlined style={{ color: '#1677ff', fontSize: 12 }} />;
}

function getMemberTypeTag(member: Member) {
  const color = member.memberType === 'measure' ? 'purple' : 'blue';
  return (
    <Tag color={color} style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>
      {member.memberType}
    </Tag>
  );
}

function isMemberSelected(
  logicalQuery:
    | {
        dimensions?: Array<string | { name: string }>;
        measures?: Array<string | { name: string }>;
      }
    | null
    | undefined,
  memberName: string,
  memberType: MemberType,
): boolean {
  if (!logicalQuery) {
    return false;
  }

  const members =
    memberType === 'measure' ? logicalQuery.measures : logicalQuery.dimensions;

  return (members || []).some((m) =>
    typeof m === 'string' ? m === memberName : m.name === memberName,
  );
}

function isMemberInFilters(
  logicalQuery:
    | {
        filters?: Array<{
          name?: string;
          type?: string;
          value?: any;
          memberType?: string;
        }>;
      }
    | null
    | undefined,
  memberName: string,
): boolean {
  if (!logicalQuery?.filters) {
    return false;
  }

  return logicalQuery.filters.some((filter: any) => filter.name === memberName);
}

function groupMembersByCube(
  view: SemanticView,
  logicalQuery:
    | {
        dimensions?: Array<string | { name: string }>;
        measures?: Array<string | { name: string }>;
        filters?: Array<any>;
      }
    | null
    | undefined,
): MembersByCube {
  const grouped: MembersByCube = {};
  const viewName = view.name;

  // Process dimensions
  view.dimensions?.forEach((dim) => {
    const cubeName = dim.aliasMember?.split('.')[0] || viewName;
    if (!grouped[cubeName]) {
      grouped[cubeName] = [];
    }
    grouped[cubeName].push({
      name: dim.name,
      title: dim.title,
      type: dim.type,
      memberType: 'dimension',
      aliasMember: dim.aliasMember,
      isSelected: isMemberSelected(logicalQuery, dim.name, 'dimension'),
      hasFilter: isMemberInFilters(logicalQuery, dim.name),
    });
  });

  // Process measures
  view.measures?.forEach((measure) => {
    const cubeName = measure.aliasMember?.split('.')[0] || viewName;
    if (!grouped[cubeName]) {
      grouped[cubeName] = [];
    }
    grouped[cubeName].push({
      name: measure.name,
      title: measure.title,
      type: measure.type,
      memberType: 'measure',
      aliasMember: measure.aliasMember,
      isSelected: isMemberSelected(logicalQuery, measure.name, 'measure'),
      hasFilter: isMemberInFilters(logicalQuery, measure.name),
    });
  });

  return grouped;
}

export function DataAssetPanel() {
  const { semanticViews, dataAssetsLoading } = useDataAssetsContext();
  const {
    report,
    updateLogicalQueryAndRunQuery,
    selectedSemanticView,
    setSelectedSemanticView,
    clearReport,
    addFilterForColumn,
    removeFilterByColumnId,
  } = useReportContext();

  const selectedView = useMemo(() => {
    if (!selectedSemanticView) {
      return null;
    }

    return (
      (semanticViews as SemanticView[]).find(
        (v) => v.name === selectedSemanticView,
      ) || null
    );
  }, [semanticViews, selectedSemanticView]);

  const membersByCube = useMemo(() => {
    if (!selectedView) {
      return {};
    }

    return groupMembersByCube(selectedView, report?.logicalQuery);
  }, [selectedView, report?.logicalQuery]);

  const cubeNames = useMemo(() => Object.keys(membersByCube), [membersByCube]);

  const toggleMember = useCallback(
    (member: Member) => {
      if (!selectedSemanticView) {
        return;
      }

      const queryKey =
        member.memberType === 'measure' ? 'measures' : 'dimensions';
      const currentMembers = report?.logicalQuery?.[queryKey] || [];
      const isSelected = isMemberSelected(
        report?.logicalQuery,
        member.name,
        member.memberType,
      );

      let updatedMembers;
      if (isSelected) {
        updatedMembers = currentMembers.filter(
          (m: string | { name: string }) =>
            typeof m === 'string' ? m !== member.name : m.name !== member.name,
        );
      } else {
        updatedMembers = [...currentMembers, { name: member.name }];
      }

      updateLogicalQueryAndRunQuery({
        semanticView: selectedSemanticView,
        [queryKey]: updatedMembers,
      });
    },
    [selectedSemanticView, report?.logicalQuery, updateLogicalQueryAndRunQuery],
  );

  const handleAddFilter = useCallback(
    (member: Member, e: React.MouseEvent) => {
      e.stopPropagation();

      if (!member.name) {
        console.error('Member name is undefined!', member);
        return;
      }

      addFilterForColumn?.(member.name);
    },
    [addFilterForColumn],
  );

  const handleRemoveFilter = useCallback(
    (member: Member, e: React.MouseEvent) => {
      e.stopPropagation();

      if (!member.name) {
        console.error('Member name is undefined!', member);
        return;
      }

      removeFilterByColumnId?.(member.name);
    },
    [removeFilterByColumnId],
  );

  if (dataAssetsLoading) {
    return <Text type="secondary">Loading data assets...</Text>;
  }

  const collapseItems = cubeNames.map((cubeName) => ({
    key: cubeName,
    label: (
      <Text strong style={{ fontSize: 13 }}>
        {cubeName}{' '}
        <Text type="secondary">({membersByCube[cubeName].length})</Text>
      </Text>
    ),
    children: (
      <Flex vertical gap={4}>
        {membersByCube[cubeName].map((member) => (
          <Flex
            key={member.name}
            role="button"
            tabIndex={0}
            align="center"
            gap={8}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: member.isSelected ? '#e6f4ff' : '#fafafa',
              border: member.isSelected
                ? '1px solid #1677ff'
                : '1px solid transparent',
              position: 'relative',
            }}
            onClick={() => toggleMember(member)}
            onKeyDown={(e) => e.key === 'Enter' && toggleMember(member)}
            className="member-item"
          >
            {member.isSelected ? (
              <CheckOutlined style={{ color: '#1677ff', fontSize: 12 }} />
            ) : (
              getMemberIcon(member)
            )}
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {member.title || member.name}
            </Text>
            <Flex align="center" gap={4}>
              {member.memberType === 'dimension' && (
                <Button
                  type="text"
                  size="small"
                  icon={<FilterOutlined style={{ fontSize: 12 }} />}
                  onClick={(e) => {
                    if (member.hasFilter) {
                      handleRemoveFilter(member, e);
                    } else {
                      handleAddFilter(member, e);
                    }
                  }}
                  className="filter-button"
                  style={{
                    padding: '0 4px',
                    height: 20,
                    minWidth: 20,
                    color: member.hasFilter ? '#1677ff' : undefined,
                    opacity: member.hasFilter ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}
                />
              )}
              {getMemberTypeTag(member)}
            </Flex>
          </Flex>
        ))}
      </Flex>
    ),
  }));

  return (
    <>
      <style>
        {`
          .member-item:hover .filter-button {
            opacity: 1 !important;
          }
        `}
      </style>
      <Card
        style={{ width: '100%', height: 400 }}
        styles={{
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {selectedView ? (
          <>
            <Flex
              align="center"
              gap={8}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #d9d9d9',
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  clearReport();
                  setSelectedSemanticView(null);
                }}
              />
              <Text strong style={{ flex: 1, fontSize: 14 }}>
                {selectedView.title || selectedView.name}
              </Text>
            </Flex>
            <Flex vertical style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              {cubeNames.length > 0 ? (
                <Collapse
                  defaultActiveKey={cubeNames}
                  ghost
                  items={collapseItems}
                />
              ) : (
                <Flex
                  align="center"
                  justify="center"
                  style={{ height: '100%' }}
                >
                  <Text type="secondary">No members in this view</Text>
                </Flex>
              )}
            </Flex>
          </>
        ) : (
          <>
            <Flex
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #d9d9d9',
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                Views
              </Text>
            </Flex>
            <Flex vertical style={{ flex: 1, overflow: 'auto' }}>
              {(semanticViews as SemanticView[]).map((view) => (
                <Flex
                  key={view.name}
                  role="button"
                  tabIndex={0}
                  align="center"
                  gap={8}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => setSelectedSemanticView(view.name)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && setSelectedSemanticView(view.name)
                  }
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = '#fafafa')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  <TableOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
                  {view.title || view.name}
                </Flex>
              ))}
            </Flex>
          </>
        )}
      </Card>
    </>
  );
}
