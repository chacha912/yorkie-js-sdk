/*
 * Copyright 2024 The Yorkie Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState } from 'react';
import { PresenceTree } from '../components/Tree';
import { JSONDetail } from '../components/Detail';
import { useSeletedPresence } from '../contexts/SeletedPresence';
import { useYorkieDoc } from '../contexts/YorkieSource';
import { CloseIcon } from '../icons';

export function Presence() {
  const [doc] = useYorkieDoc();
  const [selectedPresence, setSelectedPresence] = useSeletedPresence();
  const [presences, setPresences] = useState([]);
  useEffect(() => {
    if (!doc) return;
    // TODO(chacha912): Enhance to prevent updates when there are no changes in the presences.
    const rawPresences = doc.getPresences();
    if (rawPresences.length === 0) return;
    const myClientID = doc.getChangeID().getActorID();
    const others = rawPresences
      .filter((a) => a.clientID !== myClientID)
      .sort((a, b) => (a.clientID > b.clientID ? 1 : -1));
    const me = rawPresences.find((a) => a.clientID === myClientID);
    setPresences([me, ...others]);

    //NOTE(chacha912): When the presence changes, also update the currently selected presence.
    if (!selectedPresence) return;
    const [actorID, key] = selectedPresence.id.split('-');
    const selectedPresenceValue = rawPresences.find(
      (a) => a.clientID === actorID,
    )?.presence;
    if (!selectedPresenceValue) {
      setSelectedPresence(null);
      return;
    }
    setSelectedPresence((prev) => ({
      ...prev,
      value: selectedPresenceValue[key],
    }));
  }, [doc]);

  return (
    <div className="yorkie-presence content-wrap">
      <div className="title">Presence</div>
      <div className="content">
        <PresenceTree presences={presences} />
        {selectedPresence && (
          <div className="selected-content">
            <div className="selected-title">
              {selectedPresence.key}
              <button
                className="selected-close-btn"
                onClick={() => {
                  setSelectedPresence(null);
                }}
              >
                <CloseIcon />
              </button>
            </div>
            <JSONDetail
              json={JSON.stringify(selectedPresence.value, null, 2)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
