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
import { RangePicker } from 'src/components/DatePicker';
import { AntdThemeProvider } from 'src/components/AntdThemeProvider';
import { useLocale } from 'src/hooks/useLocale';
import { PluginFilterQuarterProps } from './types';
import { FilterPluginStyle } from '../common';

// 获取季度的开始日期
function getQuarterStart(date: dayjs.Dayjs): dayjs.Dayjs {
  const quarter = Math.floor(date.month() / 3);
  return date.month(quarter * 3).startOf('month');
}

// 获取季度的结束日期
function getQuarterEnd(date: dayjs.Dayjs): dayjs.Dayjs {
  const quarter = Math.floor(date.month() / 3);
  return date.month(quarter * 3 + 2).endOf('month');
}

// 解析季度预设
function resolveQuarterPreset(
  preset: string,
): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const now = dayjs();
  if (preset === 'This quarter') {
    return [getQuarterStart(now), getQuarterEnd(now)];
  }
  if (preset === 'Last quarter') {
    const lastQuarter = now.subtract(3, 'month');
    return [getQuarterStart(lastQuarter), getQuarterEnd(lastQuarter)];
  }
  // 解析 "2026-Q1" 格式
  const match = preset.match(/^(\d{4})-Q(\d)$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const q = parseInt(match[2], 10);
    const start = dayjs().year(year).month((q - 1) * 3).startOf('month');
    const end = dayjs().year(year).month((q - 1) * 3 + 2).endOf('month');
    return [start, end];
  }
  return null;
}

// 应用季度预设
function applyQuarterPreset(
  preset: string,
  setDataMask: PluginFilterQuarterProps['setDataMask'],
) {
  const resolved = resolveQuarterPreset(preset);
  if (!resolved) return;
  const timeRange = `${resolved[0].format('YYYY-MM-DD')} : ${resolved[1].format('YYYY-MM-DD')}`;
  const startQuarter = Math.floor(resolved[0].month() / 3) + 1;
  const endQuarter = Math.floor(resolved[1].month() / 3) + 1;
  const label = `${resolved[0].format('YYYY')}-Q${startQuarter} : ${resolved[1].format('YYYY')}-Q${endQuarter}`;
  setDataMask({
    extraFormData: {
      filters: [{ col: 'quarter_val', op: '==', val: timeRange }],
    },
    // value 保存预设名称，和月度过滤器保持一致
    filterState: { value: preset, label },
  });
}

const QuarterStyles = styled(FilterPluginStyle)`
  display: flex;
  align-items: center;
`;

const ControlContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

export default function QuarterFilterPlugin(props: PluginFilterQuarterProps) {
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
  const { defaultQuarter } = formData;

  const setDataMaskRef = useRef(setDataMask);
  setDataMaskRef.current = setDataMask;
  const defaultAppliedRef = useRef(false);

  const handleQuarterChange = useCallback(
    (dates: any) => {
      if (!dates) {
        setDataMask({
          extraFormData: {},
          filterState: { value: undefined, label: undefined },
        });
        return;
      }
      const startDate = getQuarterStart(dates[0]);
      const endDate = getQuarterEnd(dates[1]);

      const timeRange = `${startDate.format('YYYY-MM-DD')} : ${endDate.format('YYYY-MM-DD')}`;

      // value 和 label 都使用季度格式
      const startQuarter = Math.floor(dates[0].month() / 3) + 1;
      const endQuarter = Math.floor(dates[1].month() / 3) + 1;
      const value = `${dates[0].format('YYYY')}-Q${startQuarter} : ${dates[1].format('YYYY')}-Q${endQuarter}`;

      setDataMask({
        extraFormData: {
          filters: [{ col: 'quarter_val', op: '==', val: timeRange }],
        },
        filterState: { value, label: value },
      });
    },
    [setDataMask],
  );

  // 解析默认季度预设
  useEffect(() => {
    const { value } = filterState;
    // 如果 value 是预设名称，解析并应用
    if (value && value !== NO_TIME_RANGE && resolveQuarterPreset(value)) {
      defaultAppliedRef.current = true;
      applyQuarterPreset(value, setDataMaskRef.current);
    } else if (
      // 如果 value 为空且有默认配置，应用默认预设
      (!value || value === NO_TIME_RANGE) &&
      defaultQuarter &&
      resolveQuarterPreset(defaultQuarter) &&
      !defaultAppliedRef.current
    ) {
      defaultAppliedRef.current = true;
      applyQuarterPreset(defaultQuarter, setDataMaskRef.current);
    }
  }, [filterState?.value, defaultQuarter]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当配置变化时重置默认值追踪
  useEffect(() => {
    defaultAppliedRef.current = false;
  }, [defaultQuarter]);

  const quarterRange = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;

    // 如果 value 是预设名称，解析它
    const resolved = resolveQuarterPreset(value);
    if (resolved) {
      return [resolved[0], resolved[1]];
    }

    // 否则 value 是季度范围字符串，如 "2026-Q1 : 2026-Q3"
    const parts = value.split(' : ');
    if (parts.length !== 2) return null;

    const parseQuarter = (q: string): dayjs.Dayjs | null => {
      const match = q.match(/^(\d{4})-Q(\d)$/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const quarter = parseInt(match[2], 10);
      return dayjs().year(year).month((quarter - 1) * 3).startOf('month');
    };

    const start = parseQuarter(parts[0]);
    const end = parseQuarter(parts[1]);

    if (!start || !end) return null;
    return [start, end];
  }, [filterState]);

  return formData?.inView ? (
    <AntdThemeProvider locale={locale ?? undefined}>
      <QuarterStyles width={width} height={height}>
        <ControlContainer
          ref={inputRef}
          onFocus={setFocusedFilter}
          onBlur={unsetFocusedFilter}
          onMouseEnter={setHoveredFilter}
          onMouseLeave={unsetHoveredFilter}
        >
          <RangePicker
            picker="quarter"
            value={quarterRange as any}
            onChange={handleQuarterChange}
            format="YYYY-[Q]Q"
            getPopupContainer={(triggerNode) =>
              triggerNode?.parentElement || document.body
            }
            css={css`
              width: 100%;
            `}
          />
        </ControlContainer>
      </QuarterStyles>
    </AntdThemeProvider>
  ) : null;
}
