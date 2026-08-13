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
import { DataMaskStateWithId, styled, t, useTheme } from '@superset-ui/core';
import Loading from 'src/components/Loading';
import Button from 'src/components/Button';
import Icons from 'src/components/Icons';
import { Tooltip } from 'src/components/Tooltip';
import { RootState } from 'src/dashboard/types';
import { useChartLayoutItems } from 'src/dashboard/util/useChartLayoutItems';
import { useChartIds } from 'src/dashboard/util/charts/useChartIds';
import { useSelector } from 'react-redux';
import FilterControls from './FilterControls/FilterControls';
import { useChartsVerboseMaps, getFilterBarTestId } from './utils';
import { HorizontalBarProps } from './types';
import FilterBarSettings from './FilterBarSettings';
import crossFiltersSelector from './CrossFilters/selectors';

const COLLAPSED_HEIGHT = 52; // 收起时的高度，大约显示一行过滤器

const HorizontalBar = styled.div<{ isCollapsed: boolean }>`
  ${({ theme, isCollapsed }) => `
    padding: ${theme.gridUnit * 3}px ${theme.gridUnit * 2}px ${
      theme.gridUnit * 3
    }px ${theme.gridUnit * 4}px;
    background: ${theme.colors.grayscale.light5};
    box-shadow: inset 0px -2px 2px -1px ${theme.colors.grayscale.light2};
    ${isCollapsed ? `max-height: ${COLLAPSED_HEIGHT}px;` : ''}
    overflow: hidden;
    transition: max-height 0.3s ease;
  `}
`;

const HorizontalBarContent = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    line-height: 0;

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
  const theme = useTheme();
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

  const handleToggle = () => {
    if (toggleFiltersBar) {
      toggleFiltersBar(!filtersOpen);
    }
  };

  return (
    <HorizontalBar
      {...getFilterBarTestId()}
      isCollapsed={isCollapsed}
    >
      <HorizontalBarContent>
        {!isInitialized ? (
          <Loading position="inline-centered" />
        ) : (
          <>
            <FilterBarSettings />
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
            {actions}
            {hasFilters && toggleFiltersBar && (
              <Tooltip
                title={
                  filtersOpen
                    ? t('Collapse filters')
                    : t('Expand filters')
                }
              >
                <ToggleButton
                  data-test="horizontal-filterbar-toggle"
                  buttonStyle="link"
                  buttonSize="xsmall"
                  onClick={handleToggle}
                >
                  {filtersOpen ? (
                    <Icons.CaretUp
                      iconColor={theme.colors.grayscale.base}
                    />
                  ) : (
                    <Icons.CaretDown
                      iconColor={theme.colors.grayscale.base}
                    />
                  )}
                </ToggleButton>
              </Tooltip>
            )}
          </>
        )}
      </HorizontalBarContent>
    </HorizontalBar>
  );
};
export default memo(HorizontalFilterBar);
