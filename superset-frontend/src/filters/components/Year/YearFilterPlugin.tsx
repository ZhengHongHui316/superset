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
import { css, styled, NO_TIME_RANGE } from '@superset-ui/core';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from 'src/components/DatePicker';
import { AntdThemeProvider } from 'src/components/AntdThemeProvider';
import { useLocale } from 'src/hooks/useLocale';
import { PluginFilterYearProps } from './types';
import { FilterPluginStyle } from '../common';

const YearStyles = styled(FilterPluginStyle)`
  display: flex;
  align-items: center;
`;

const ControlContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

export default function YearFilterPlugin(props: PluginFilterYearProps) {
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

  const locale = useLocale();
  const { defaultYear } = formData;

  const setDataMaskRef = useRef(setDataMask);
  setDataMaskRef.current = setDataMask;
  const defaultAppliedRef = useRef(false);

  const handleYearChange = useCallback(
    (date: any) => {
      if (!date) {
        setDataMask({
          extraFormData: {},
          filterState: { value: undefined, label: undefined },
        });
        return;
      }

      const startDate = date.startOf('year');
      const endDate = date.endOf('year');

      const timeRange = `${startDate.format('YYYY-MM-DD')} : ${endDate.format('YYYY-MM-DD')}`;
      const label = date.format('YYYY');

      setDataMask({
        extraFormData: {
          filters: [{ col: 'year_val', op: '==', val: timeRange }],
        },
        filterState: { value: label, label },
      });
    },
    [setDataMask],
  );

  // 解析默认年度预设
  useEffect(() => {
    const { value } = filterState;

    if ((!value || value === NO_TIME_RANGE) && defaultYear && !defaultAppliedRef.current) {
      defaultAppliedRef.current = true;

      const now = dayjs();
      let year = now;

      if (defaultYear === 'This year') {
        year = now.startOf('year');
      } else if (defaultYear === 'Last year') {
        year = now.subtract(1, 'year').startOf('year');
      }

      const timeRange = `${year.startOf('year').format('YYYY-MM-DD')} : ${year.endOf('year').format('YYYY-MM-DD')}`;
      const label = year.format('YYYY');

      setDataMaskRef.current({
        extraFormData: {
          filters: [{ col: 'year_val', op: '==', val: timeRange }],
        },
        filterState: { value: label, label },
      });
    }
  }, [filterState?.value, defaultYear]);

  // 当配置变化时重置默认值追踪
  useEffect(() => {
    defaultAppliedRef.current = false;
  }, [defaultYear]);

  const selectedYear = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;

    const year = dayjs(value, 'YYYY');
    if (!year.isValid()) return null;
    return year.startOf('year');
  }, [filterState]);

  return formData?.inView ? (
    <AntdThemeProvider locale={locale ?? undefined}>
      <YearStyles width={width} height={height}>
        <ControlContainer
          ref={inputRef}
          onFocus={setFocusedFilter}
          onBlur={unsetFocusedFilter}
          onMouseEnter={setHoveredFilter}
          onMouseLeave={unsetHoveredFilter}
        >
          <DatePicker
            picker="year"
            value={selectedYear as any}
            onChange={handleYearChange}
            format="YYYY"
            getPopupContainer={(triggerNode) =>
              triggerNode?.parentElement || document.body
            }
            css={css`
              width: 100%;
            `}
          />
        </ControlContainer>
      </YearStyles>
    </AntdThemeProvider>
  ) : null;
}
