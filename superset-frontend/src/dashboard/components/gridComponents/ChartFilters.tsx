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
import { FC, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DataMask,
  DataMaskStateWithId,
  DataMaskWithId,
  Filter,
  Filters,
  isFilterDivider,
  styled,
} from '@superset-ui/core';
import { RootState, FilterBarOrientation } from 'src/dashboard/types';
import { updateDataMask } from 'src/dataMask/actions';
import { getInitialDataMask } from 'src/dataMask/reducer';
import FilterValue from '../nativeFilters/FilterBar/FilterControls/FilterValue';

interface ChartFiltersProps {
  chartId: number;
}

const InlineFiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.gridUnit * 3}px;
  padding: ${({ theme }) => theme.gridUnit * 2}px
    ${({ theme }) => theme.gridUnit * 3}px;
  background: ${({ theme }) => theme.colors.grayscale.light4};
  border-bottom: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
`;

const InlineFilterItem = styled.div`
  min-width: 150px;
  max-width: 300px;
  flex: 1;
`;

const InlineFilterLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.sizes.s}px;
  color: ${({ theme }) => theme.colors.grayscale.dark1};
  margin-bottom: ${({ theme }) => theme.gridUnit}px;
  font-weight: ${({ theme }) => theme.typography.weights.bold};
`;

const ChartFilters: FC<ChartFiltersProps> = ({ chartId }) => {
  const dispatch = useDispatch();

  const nativeFilters = useSelector<RootState, Filters>(
    state => state.nativeFilters?.filters || {},
  );
  const dataMask = useSelector<RootState, DataMaskStateWithId>(
    state => state.dataMask,
  );

  const applicableFilters = useMemo(
    () =>
      Object.values(nativeFilters).filter(
        (f): f is Filter =>
          !isFilterDivider(f) &&
          f.type === 'NATIVE_FILTER' &&
          Array.isArray(f.chartsInScope) &&
          f.chartsInScope.includes(chartId),
      ),
    [nativeFilters, chartId],
  );

  const handleFilterSelectionChange = useCallback(
    (filter: Filter, dataMaskChange: DataMask) => {
      const mergedDataMask: DataMaskWithId = {
        ...(getInitialDataMask(filter.id) as DataMaskWithId),
        ...dataMaskChange,
      };
      dispatch(updateDataMask(filter.id, mergedDataMask));
    },
    [dispatch],
  );

  if (applicableFilters.length === 0) {
    return null;
  }

  return (
    <InlineFiltersContainer>
      {applicableFilters.map(filter => (
        <InlineFilterItem key={filter.id}>
          <InlineFilterLabel>{filter.name}</InlineFilterLabel>
          <FilterValue
            dataMaskSelected={dataMask}
            filter={{
              ...filter,
              dataMask: dataMask[filter.id],
            }}
            onFilterSelectionChange={handleFilterSelectionChange}
            inView
            orientation={FilterBarOrientation.Horizontal}
          />
        </InlineFilterItem>
      ))}
    </InlineFiltersContainer>
  );
};

export default ChartFilters;
