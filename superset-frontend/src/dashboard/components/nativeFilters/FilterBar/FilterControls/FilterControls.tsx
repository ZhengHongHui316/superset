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
import { memo, Fragment, FC, useCallback, useMemo } from 'react';
import {
  DataMask,
  DataMaskStateWithId,
  Filter,
  Divider,
  css,
  SupersetTheme,
  isFeatureEnabled,
  FeatureFlag,
  isFilterDivider,
} from '@superset-ui/core';
import {
  createHtmlPortalNode,
  InPortal,
  OutPortal,
} from 'react-reverse-portal';
import { useSelector } from 'react-redux';
import {
  useDashboardHasTabs,
  useSelectFiltersInScope,
} from 'src/dashboard/components/nativeFilters/state';
import { FilterBarOrientation, RootState } from 'src/dashboard/types';
import { useChartIds } from 'src/dashboard/util/charts/useChartIds';
import { useChartLayoutItems } from 'src/dashboard/util/useChartLayoutItems';
import { FiltersOutOfScopeCollapsible } from '../FiltersOutOfScopeCollapsible';
import { useFilterControlFactory } from '../useFilterControlFactory';
import crossFiltersSelector from '../CrossFilters/selectors';
import CrossFilter from '../CrossFilters/CrossFilter';
import { useFilterOutlined } from '../useFilterOutlined';
import { useChartsVerboseMaps } from '../utils';

type FilterControlsProps = {
  dataMaskSelected: DataMaskStateWithId;
  onFilterSelectionChange: (filter: Filter, dataMask: DataMask) => void;
};

const FilterControls: FC<FilterControlsProps> = ({
  dataMaskSelected,
  onFilterSelectionChange,
}) => {
  const filterBarOrientation = useSelector<RootState, FilterBarOrientation>(
    ({ dashboardInfo }) =>
      isFeatureEnabled(FeatureFlag.HorizontalFilterBar)
        ? dashboardInfo.filterBarOrientation
        : FilterBarOrientation.Vertical,
  );

  useFilterOutlined();

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
  const { filterControlFactory, filtersWithValues } = useFilterControlFactory(
    dataMaskSelected,
    onFilterSelectionChange,
  );
  const portalNodes = useMemo(() => {
    const nodes = new Array(filtersWithValues.length);
    for (let i = 0; i < filtersWithValues.length; i += 1) {
      nodes[i] = createHtmlPortalNode();
    }
    return nodes;
  }, [filtersWithValues.length]);

  const filterIds = new Set(filtersWithValues.map(item => item.id));

  const [filtersInScope, filtersOutOfScope] =
    useSelectFiltersInScope(filtersWithValues);

  const hasRequiredFirst = useMemo(
    () => filtersWithValues.some(filter => filter.requiredFirst),
    [filtersWithValues],
  );

  const dashboardHasTabs = useDashboardHasTabs();
  const showCollapsePanel = dashboardHasTabs && filtersWithValues.length > 0;

  const renderer = useCallback(
    ({ id }: Filter | Divider, index: number) => {
      const filterIndex = filtersWithValues.findIndex(f => f.id === id);
      return (
        // Empty text node is to ensure there's always an element preceding
        // the OutPortal, otherwise react-reverse-portal crashes
        <Fragment key={index ?? id}>
          {'' /* eslint-disable-line react/jsx-curly-brace-presence */}
          <OutPortal node={portalNodes[filterIndex]} inView />
        </Fragment>
      );
    },
    [filtersWithValues, portalNodes],
  );

  const renderVerticalContent = useCallback(
    () => (
      <>
        {filtersInScope.map(renderer)}
        {showCollapsePanel && (
          <FiltersOutOfScopeCollapsible
            filtersOutOfScope={filtersOutOfScope}
            forceRender={hasRequiredFirst}
            hasTopMargin={filtersInScope.length > 0}
            renderer={renderer}
          />
        )}
      </>
    ),
    [
      filtersInScope,
      renderer,
      showCollapsePanel,
      filtersOutOfScope,
      hasRequiredFirst,
    ],
  );

  const rendererCrossFilter = useCallback(
    (crossFilter, orientation, last) => (
      <CrossFilter
        filter={crossFilter}
        orientation={orientation}
        last={
          filtersInScope.length > 0 &&
          `${last.name}${last.emitterId}` ===
            `${crossFilter.name}${crossFilter.emitterId}`
        }
      />
    ),
    [filtersInScope.length],
  );

  // 水平模式：按 Divider 将过滤器分成多个分组，每组独立一行 flex 容器
  const horizontalGroups = useMemo(() => {
    type Group = {
      divider: Divider | null;
      nativeFilterIndices: number[]; // indices into filtersInScope
    };

    const groups: Group[] = [];
    let currentGroup: Group = { divider: null, nativeFilterIndices: [] };

    filtersInScope.forEach((filter, index) => {
      if (isFilterDivider(filter)) {
        // 保存之前的分组
        groups.push(currentGroup);
        // 新建分组，divider 作为标题
        currentGroup = { divider: filter, nativeFilterIndices: [] };
      } else {
        currentGroup.nativeFilterIndices.push(index);
      }
    });
    groups.push(currentGroup);

    return groups;
  }, [filtersInScope]);

  const crossFilterElements = useMemo(
    () =>
      selectedCrossFilters.map(c =>
        rendererCrossFilter(
          c,
          FilterBarOrientation.Horizontal,
          selectedCrossFilters.at(-1),
        ),
      ),
    [selectedCrossFilters, rendererCrossFilter],
  );

  const renderHorizontalContent = useCallback(
    () => (
      <div
        css={(theme: SupersetTheme) => css`
          display: flex;
          flex-direction: column;
          gap: ${theme.gridUnit * 2}px;
          padding: ${theme.gridUnit}px ${theme.gridUnit * 4}px;
          min-width: 0;
          flex: 1;
        `}
      >
        {/* Cross filters 放在第一行 */}
        {crossFilterElements.length > 0 && (
          <div
            css={(theme: SupersetTheme) => css`
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: ${theme.gridUnit * 4}px;
            `}
          >
            {crossFilterElements.map((el, i) => (
              <div key={`cross-${i}`}>{el}</div>
            ))}
          </div>
        )}

        {/* 按 Divider 分组的 native filters */}
        {horizontalGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.divider && (
              <div
                css={(t: SupersetTheme) => css`
                  border-bottom: 1px solid ${t.colors.grayscale.light2};
                  padding-bottom: ${t.gridUnit * 2}px;
                  margin-bottom: ${t.gridUnit * 2}px;
                `}
              >
                <h3
                  css={(t: SupersetTheme) => css`
                    font-size: ${t.typography.sizes.m}px;
                    font-weight: ${t.typography.weights.bold};
                    margin: 0;
                    color: ${t.colors.grayscale.dark1};
                  `}
                >
                  {group.divider.title}
                </h3>
                {group.divider.description && (
                  <p
                    css={(t: SupersetTheme) => css`
                      font-size: ${t.typography.sizes.s}px;
                      color: ${t.colors.grayscale.base};
                      margin: ${t.gridUnit}px 0 0 0;
                    `}
                  >
                    {group.divider.description}
                  </p>
                )}
              </div>
            )}
            {group.nativeFilterIndices.length > 0 && (
              <div
                css={(theme: SupersetTheme) => css`
                  display: flex;
                  flex-wrap: wrap;
                  align-items: center;
                  gap: ${theme.gridUnit * 4}px;
                `}
              >
                {group.nativeFilterIndices.map(scopeIndex => {
                  const filter = filtersInScope[scopeIndex];
                  const filterIndex = filtersWithValues.findIndex(
                    f => f.id === filter.id,
                  );
                  return (
                    <div key={filter.id}>
                      <OutPortal node={portalNodes[filterIndex]} inView />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {showCollapsePanel && (
          <FiltersOutOfScopeCollapsible
            filtersOutOfScope={filtersOutOfScope}
            forceRender={hasRequiredFirst}
            hasTopMargin={filtersInScope.length > 0}
            renderer={renderer}
          />
        )}
      </div>
    ),
    [
      crossFilterElements,
      horizontalGroups,
      filtersInScope,
      filtersWithValues,
      portalNodes,
      filtersOutOfScope,
      showCollapsePanel,
      renderer,
      hasRequiredFirst,
    ],
  );

  return (
    <>
      {portalNodes
        .filter((node, index) => filterIds.has(filtersWithValues[index].id))
        .map((node, index) => (
          <InPortal node={node} key={filtersWithValues[index].id}>
            {filterControlFactory(index, filterBarOrientation, false)}
          </InPortal>
        ))}
      {filterBarOrientation === FilterBarOrientation.Vertical &&
        renderVerticalContent()}
      {filterBarOrientation === FilterBarOrientation.Horizontal &&
        renderHorizontalContent()}
    </>
  );
};

export default memo(FilterControls);
