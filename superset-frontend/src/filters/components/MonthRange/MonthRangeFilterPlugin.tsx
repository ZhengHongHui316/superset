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
import { styled, NO_TIME_RANGE } from '@superset-ui/core';
import { useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { RangePicker } from 'src/components/DatePicker';
import { PluginFilterMonthRangeProps } from './types';
import { FilterPluginStyle } from '../common';

const Container = styled(FilterPluginStyle)`
  display: flex;
  align-items: center;
  min-width: 160px;
`;

export default function MonthRangeFilterPlugin(
  props: PluginFilterMonthRangeProps,
) {
  const {
    setDataMask,
    setHoveredFilter,
    unsetHoveredFilter,
    setFocusedFilter,
    unsetFocusedFilter,
    width,
    height,
    filterState,
    inputRef,
    formData,
  } = props;

  const handleMonthChange = useCallback(
    (dates: any) => {
      if (!dates || dates.length !== 2) {
        setDataMask({
          extraFormData: {},
          filterState: { value: undefined },
        });
        return;
      }
      const timeRange = `${dates[0].startOf('month').format('YYYY-MM-DD')} : ${dates[1].endOf('month').format('YYYY-MM-DD')}`;
      const value = `${dates[0].format('YYYY-MM')} : ${dates[1].format('YYYY-MM')}`;
      setDataMask({
        extraFormData: { time_range: timeRange },
        filterState: { value },
      });
    },
    [setDataMask],
  );

  const monthRange = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;
    const parts = value.split(' : ');
    if (parts.length !== 2) return null;
    return [dayjs(parts[0]), dayjs(parts[1])];
  }, [filterState]);

  return formData?.inView ? (
    <Container width={width} height={height}>
      <div
        ref={inputRef}
        style={{ width: '100%' }}
        onFocus={setFocusedFilter}
        onBlur={unsetFocusedFilter}
        onMouseEnter={setHoveredFilter}
        onMouseLeave={unsetHoveredFilter}
      >
        <RangePicker
          picker="month"
          value={monthRange as any}
          onChange={handleMonthChange}
          size="small"
          format="YYYY-MM"
          style={{ width: '100%', minWidth: 260 }}
        />
      </div>
    </Container>
  ) : null;
}
