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
import { DatePicker } from 'src/components/DatePicker';
import { AntdThemeProvider } from 'src/components/AntdThemeProvider';
import { useLocale } from 'src/hooks/useLocale';
import { PluginFilterYearProps, YEAR_PRESETS } from './types';
import { FilterPluginStyle } from '../common';

const PRESET_LABEL_MAP: Record<string, string> = Object.fromEntries(
  YEAR_PRESETS.map(p => [p.value, p.label]),
);

type PresetFactory = () => dayjs.Dayjs;

export const YEAR_PRESET_MAP: Record<string, PresetFactory> = {
  'This year': () => dayjs().startOf('year'),
  'Last year': () => dayjs().subtract(1, 'year').startOf('year'),
};

export function resolveYearPreset(preset: string): dayjs.Dayjs | null {
  const factory = YEAR_PRESET_MAP[preset];
  return factory ? factory() : null;
}

function applyYearPreset(
  preset: string,
  setDataMask: PluginFilterYearProps['setDataMask'],
) {
  const resolved = resolveYearPreset(preset);
  if (!resolved) return;
  const timeRange = `${resolved.startOf('year').format('YYYY-MM-DD')} : ${resolved.endOf('year').format('YYYY-MM-DD')}`;
  setDataMask({
    extraFormData: {
      filters: [{ col: 'year_val', op: '==', val: timeRange }],
    },
    // value 保存预设名称，和月度过滤器保持一致
    filterState: { value: preset, label: t(PRESET_LABEL_MAP[preset] || preset) },
  });
}

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
    // 如果 value 是预设名称，解析并应用
    if (value && value !== NO_TIME_RANGE && YEAR_PRESET_MAP[value]) {
      defaultAppliedRef.current = true;
      applyYearPreset(value, setDataMaskRef.current);
    } else if (
      // 如果 value 为空且有默认配置，应用默认预设
      (!value || value === NO_TIME_RANGE) &&
      defaultYear &&
      YEAR_PRESET_MAP[defaultYear] &&
      !defaultAppliedRef.current
    ) {
      defaultAppliedRef.current = true;
      applyYearPreset(defaultYear, setDataMaskRef.current);
    }
  }, [filterState?.value, defaultYear]);

  // 当配置变化时重置默认值追踪
  useEffect(() => {
    defaultAppliedRef.current = false;
  }, [defaultYear]);

  const selectedYear = useMemo(() => {
    const { value } = filterState;
    if (!value || value === NO_TIME_RANGE) return null;

    // 如果 value 是预设名称，解析它
    if (YEAR_PRESET_MAP[value]) {
      const resolved = resolveYearPreset(value);
      if (resolved) {
        return resolved.startOf('year');
      }
      return null;
    }

    // 否则 value 是年份字符串，如 "2026"
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
