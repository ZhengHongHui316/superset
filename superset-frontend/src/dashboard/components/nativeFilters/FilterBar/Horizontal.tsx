/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FC, memo, useMemo } from 'react';
import { DataMaskStateWithId, styled, t } from '@superset-ui/core';
import Loading from 'src/components/Loading';
import Button from 'src/components/Button';
import { RootState } from 'src/dashboard/types';
import { useChartLayoutItems } from 'src/dashboard/util/useChartLayoutItems';
import { useChartIds } from 'src/dashboard/util/charts/useChartIds';
import { useSelector } from 'react-redux';
import FilterControls from './FilterControls/FilterControls';
import { useChartsVerboseMaps, getFilterBarTestId } from './utils';
import { HorizontalBarProps } from './types';
import FilterBarSettings from './FilterBarSettings';
import crossFiltersSelector from './CrossFilters/selectors';

const HorizontalBar = styled.div`
  ${({ theme }) => `
    padding: ${theme.gridUnit * 2}px ${theme.gridUnit * 2}px ${
      theme.gridUnit * 2
    }px ${theme.gridUnit * 4}px;
    background: ${theme.colors.grayscale.light5};
    box-shadow: inset 0px -2px 2px -1px ${theme.colors.grayscale.light2};
  `}
`;

// 垂直布局：顶部 header 行（始终可见）+ 底部 body 行（可收起）
const BarInner = styled.div`
  display: flex;
  flex-direction: column;
`;

// 顶部行：设置图标 + 展开按钮，始终可见
const HeaderRow = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: ${theme.gridUnit * 7}px;
  `}
`;

// 底部行：过滤器 + 操作按钮，收起时整行隐藏
const BodyRow = styled.div<{ isCollapsed: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  ${({ isCollapsed }) => `
    ${isCollapsed ? 'display: none;' : ''}
  `}
`;

// 过滤器内容区域
const FilterContent = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    line-height: 0;
    flex: 1;
    min-width: 0;

    .loading {
      margin: ${theme.gridUnit * 2}px auto ${theme.gridUnit * 2}px;
      padding: 0;
    }
  `}
`;

const FilterBarEmptyStateContainer = styled.div`
  ${({ theme }) => `
    font-weight: ${theme.typography.weights.bold};
    color: ${theme.colors.grayscale.base};
    font-size: ${theme.typography.sizes.s}px;
    padding-left: ${theme.gridUnit * 2}px;
  `}
`;

const ToggleButton = styled(Button)`
  padding: 0 ${8}px;
  margin-left: auto;
  flex-shrink: 0;
`;

const HorizontalFilterBar: FC<HorizontalBarProps> = ({
  actions,
  dataMaskSelected,
  filterValues,
  filtersOpen = true,
  isInitialized,
  onSelectionChange,
  toggleFiltersBar,
}) => {
  const dataMask = useSelector<RootState, DataMaskStateWithId>(
    state => state.dataMask,
  );
  const chartIds = useChartIds();
  const chartLayoutItems = useChartLayoutItems();
  const verboseMaps = useChartsVerboseMaps();

  const selectedCrossFilters = useMemo(
    () =>
      crossFiltersSelector({
        dataMask,
        chartIds,
        chartLayoutItems,
        verboseMaps,
      }),
    [chartIds, chartLayoutItems, dataMask, verboseMaps],
  );

  const hasFilters = filterValues.length > 0 || selectedCrossFilters.length > 0;
  const isCollapsed = !filtersOpen && hasFilters;
  const filterCount = filterValues.length;

  return (
    <HorizontalBar {...getFilterBarTestId()}>
      <BarInner>
        {/* 顶部行：设置图标 + 展开按钮，始终可见 */}
        <HeaderRow>
          <FilterBarSettings />
          {hasFilters && toggleFiltersBar && (
            <ToggleButton
              data-test="horizontal-filterbar-toggle"
              buttonStyle="link"
              buttonSize="xsmall"
              onClick={() => {
                toggleFiltersBar(!filtersOpen);
              }}
            >
              {filtersOpen ? '收起 ▲' : `展开 ▼ (${filterCount})`}
            </ToggleButton>
          )}
        </HeaderRow>

        {/* 底部行：过滤器内容 + 操作按钮，收起时整行隐藏 */}
        {!isInitialized ? (
          <BodyRow isCollapsed={false}>
            <Loading position="inline-centered" />
          </BodyRow>
        ) : (
          <BodyRow isCollapsed={isCollapsed}>
            <FilterContent>
              {!hasFilters && (
                <FilterBarEmptyStateContainer data-test="horizontal-filterbar-empty">
                  {t('No filters are currently added to this dashboard.')}
                </FilterBarEmptyStateContainer>
              )}
              {hasFilters && (
                <FilterControls
                  dataMaskSelected={dataMaskSelected}
                  filtersOpen={filtersOpen}
                  onFilterSelectionChange={onSelectionChange}
                />
              )}
            </FilterContent>
            {actions}
          </BodyRow>
        )}
      </BarInner>
    </HorizontalBar>
  );
};
export default memo(HorizontalFilterBar);
