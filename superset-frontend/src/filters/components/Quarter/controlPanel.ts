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
import { ControlPanelConfig } from '@superset-ui/chart-controls';
import { t } from '@superset-ui/core';
import { QUARTER_PRESETS } from './types';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('UI Configuration'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'defaultQuarter',
            config: {
              type: 'SelectControl',
              renderTrigger: true,
              label: t('Default quarter'),
              default: null,
              choices: [
                [null, t('No default')],
                ...QUARTER_PRESETS.map(p => [p.value, t(p.label)]),
              ],
              description: t(
                'Select a default quarter that will be applied when the dashboard loads',
              ),
            },
          },
        ],
      ],
    },
  ],
};

export default config;
