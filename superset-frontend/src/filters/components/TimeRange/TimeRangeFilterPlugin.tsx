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
import { PluginFilterTimeRangeProps, TIME_RANGE_PRESETS } from './types';
import { FilterPluginStyle } from '../common';

const PRESET_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TIME_RANGE_PRESETS.map(p => [p.value, p.label]),
);

type PresetFactory = () => [dayjs.Dayjs, dayjs.Dayjs];

export const PRESET_RANGES: Record<string, PresetFactory> = {
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
    const month = now.month();
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

export function resolvePreset(
  preset: string,
): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const factory = PRESET_RANGES[preset];
  return factory ? factory() : null;
}

function applyPreset(
  preset: string,
  setDataMask: PluginFilterTimeRangeProps['setDataMask'],
) {
  const resolved = resolvePreset(preset);
  if (!resolved) return;
  const timeRange = `${resolved[0].format('YYYY-MM-DD')} : ${resolved[1].format('YYYY-MM-DD')}`;
  setDataMask({
    extraFormData: {
      filters: [{ col: 'time_val', op: '==', val: timeRange }],
    },
    filterState: { value: preset, label: t(PRESET_LABEL_MAP[preset] || preset) },
  });
}

const TimeRangeStyles = styled(FilterPluginStyle)`
  display: flex;
  align-items: center;
`;

const ControlContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

export default function TimeRangeFilterPlugin(
  props: PluginFilterTimeRangeProps,
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

  const { defaultTimeRange } = formData;

  const setDataMaskRef = useRef(setDataMask);
  setDataMaskRef.current = setDataMask;
  const defaultAppliedRef = useRef(false);

  const locale = useLocale();

  const handleTimeRangeChange = useCallback(
    (dates: any) => {
      if (!dates) {
        setDataMask({
          extraFormData: {},
          filterState: { value: undefined, label: undefined },
        });
        return;
      }
      const timeRange = `${dates[0].format('YYYY-MM-DD')} : ${dates[1].format('YYYY-MM-DD')}`;
      setDataMask({
        extraFormData: {
          filters: [{ col: 'time_val', op: '==', val: timeRange }],
        },
        filterState: { value: timeRange, label: timeRange },
      });
    },
    [setDataMask],
  );

  useEffect(() => {
    const { value } = filterState;
    if (value && value !== NO_TIME_RANGE && PRESET_RANGES[value]) {
      defaultAppliedRef.current = true;
      applyPreset(value, setDataMaskRef.current);
    } else if (
      (!value || value === NO_TIME_RANGE) &&
      defaultTimeRange &&
      PRESET_RANGES[defaultTimeRange] &&
      !defaultAppliedRef.current
    ) {
      defaultAppliedRef.current = true;
      applyPreset(defaultTimeRange, setDataMaskRef.current);
    }
  }, [filterState?.value, defaultTimeRange]);

  // Reset default tracking when the config changes
  useEffect(() => {
    defaultAppliedRef.current = false;
  }, [defaultTimeRange]);

  const dateRange = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;

    // If value is a preset name, resolve it for display
    if (PRESET_RANGES[value]) {
      const resolved = resolvePreset(value);
      if (resolved) {
        return [resolved[0], resolved[1]];
      }
      return null;
    }

    // Otherwise value is a date range string
    const parts = value.split(' : ');
    if (parts.length !== 2) return null;
    return [dayjs(parts[0]), dayjs(parts[1])];
  }, [filterState]);

  return formData?.inView ? (
    <AntdThemeProvider locale={locale ?? undefined}>
      <TimeRangeStyles width={width} height={height}>
        <ControlContainer
          ref={inputRef}
          onFocus={setFocusedFilter}
          onBlur={unsetFocusedFilter}
          onMouseEnter={setHoveredFilter}
          onMouseLeave={unsetHoveredFilter}
        >
          <RangePicker
            value={dateRange as any}
            onChange={handleTimeRangeChange}
            format="YYYY-MM-DD"
            getPopupContainer={(triggerNode) =>
              triggerNode?.parentElement || document.body
            }
            css={css`
              width: 100%;
            `}
          />
        </ControlContainer>
      </TimeRangeStyles>
    </AntdThemeProvider>
  ) : null;
}
