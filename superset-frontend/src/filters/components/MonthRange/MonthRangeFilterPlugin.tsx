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
import { css, styled, NO_TIME_RANGE, t } from '@superset-ui/core';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { RangePicker } from 'src/components/DatePicker';
import { AntdThemeProvider } from 'src/components/AntdThemeProvider';
import { useLocale } from 'src/hooks/useLocale';
import { PluginFilterMonthRangeProps, MONTH_RANGE_PRESETS } from './types';
import { FilterPluginStyle } from '../common';

const PRESET_LABEL_MAP: Record<string, string> = Object.fromEntries(
  MONTH_RANGE_PRESETS.map(p => [p.value, p.label]),
);

type PresetFactory = () => [dayjs.Dayjs, dayjs.Dayjs];

export const MONTH_PRESETS: Record<string, PresetFactory> = {
  'This month': () => {
    const now = dayjs();
    return [now.startOf('month'), now.endOf('month')];
  },
  'This year': () => {
    const now = dayjs();
    return [now.startOf('year'), now.endOf('year')];
  },
  'Last month': () => {
    const prev = dayjs().subtract(1, 'month');
    return [prev.startOf('month'), prev.endOf('month')];
  },
  'Last quarter': () => {
    const now = dayjs();
    const month = now.month(); // 0-indexed
    const currentQuarter = Math.floor(month / 3);
    const prevQuarterStartMonth =
      currentQuarter === 0 ? 9 : (currentQuarter - 1) * 3;
    const year = currentQuarter === 0 ? now.year() - 1 : now.year();
    const start = dayjs()
      .year(year)
      .month(prevQuarterStartMonth)
      .startOf('month');
    const end = dayjs()
      .year(year)
      .month(prevQuarterStartMonth + 2)
      .endOf('month');
    return [start, end];
  },
  'Last year': () => {
    const prev = dayjs().subtract(1, 'year');
    return [prev.startOf('year'), prev.endOf('year')];
  },
};

export function resolveMonthPreset(
  preset: string,
): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const factory = MONTH_PRESETS[preset];
  return factory ? factory() : null;
}

function applyMonthPreset(
  preset: string,
  setDataMask: PluginFilterMonthRangeProps['setDataMask'],
) {
  const resolved = resolveMonthPreset(preset);
  if (!resolved) return;
  const timeRange = `${resolved[0].format('YYYY-MM-DD')} : ${resolved[1].format('YYYY-MM-DD')}`;
  setDataMask({
    extraFormData: {
      filters: [{ col: 'time_val', op: '==', val: timeRange }],
    },
    filterState: { value: preset, label: t(PRESET_LABEL_MAP[preset] || preset) },
  });
}

const MonthRangeStyles = styled(FilterPluginStyle)`
  display: flex;
  align-items: center;
`;

const ControlContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
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

  const locale = useLocale();

  const { defaultMonthRange } = formData;

  const setDataMaskRef = useRef(setDataMask);
  setDataMaskRef.current = setDataMask;
  const defaultAppliedRef = useRef(false);

  const handleMonthChange = useCallback(
    (dates: any) => {
      if (!dates || dates.length !== 2) {
        setDataMask({
          extraFormData: {},
          filterState: { value: undefined, label: undefined },
        });
        return;
      }
      const timeRange = `${dates[0].startOf('month').format('YYYY-MM-DD')} : ${dates[1].endOf('month').format('YYYY-MM-DD')}`;
      const value = `${dates[0].format('YYYY-MM')} : ${dates[1].format('YYYY-MM')}`;
      setDataMask({
        extraFormData: {
          filters: [{ col: 'time_val', op: '==', val: timeRange }],
        },
        filterState: { value, label: value },
      });
    },
    [setDataMask],
  );

  useEffect(() => {
    const { value } = filterState;
    if (value && value !== NO_TIME_RANGE && MONTH_PRESETS[value]) {
      defaultAppliedRef.current = true;
      applyMonthPreset(value, setDataMaskRef.current);
    } else if (
      (!value || value === NO_TIME_RANGE) &&
      defaultMonthRange &&
      MONTH_PRESETS[defaultMonthRange] &&
      !defaultAppliedRef.current
    ) {
      defaultAppliedRef.current = true;
      applyMonthPreset(defaultMonthRange, setDataMaskRef.current);
    }
  }, [filterState?.value, defaultMonthRange]);

  // Reset default tracking when the config changes
  useEffect(() => {
    defaultAppliedRef.current = false;
  }, [defaultMonthRange]);

  const monthRange = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;

    // If value is a preset name, resolve it for display
    if (MONTH_PRESETS[value]) {
      const resolved = resolveMonthPreset(value);
      if (resolved) {
        return [resolved[0], resolved[1]];
      }
      return null;
    }

    // Otherwise value is a month range string
    const parts = value.split(' : ');
    if (parts.length !== 2) return null;
    return [dayjs(parts[0]), dayjs(parts[1])];
  }, [filterState]);

  return formData?.inView ? (
    <AntdThemeProvider locale={locale ?? undefined}>
      <MonthRangeStyles width={width} height={height}>
        <ControlContainer
          ref={inputRef}
          onFocus={setFocusedFilter}
          onBlur={unsetFocusedFilter}
          onMouseEnter={setHoveredFilter}
          onMouseLeave={unsetHoveredFilter}
          onMouseDown={(e) => e.preventDefault()}
        >
          <RangePicker
            picker="month"
            value={monthRange as any}
            onChange={handleMonthChange}
            format="YYYY-MM"
            getPopupContainer={(triggerNode) =>
              triggerNode?.parentElement || document.body
            }
            css={css`
              width: 100%;
            `}
          />
        </ControlContainer>
      </MonthRangeStyles>
    </AntdThemeProvider>
  ) : null;
}
