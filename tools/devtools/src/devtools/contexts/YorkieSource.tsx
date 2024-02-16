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

import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { Devtools, SDKToPanelMessage } from 'yorkie-js-sdk';
import { connectPort, sendToSDK } from '../../port';

const DocKeyContext = createContext<string>(null);
const YorkieDocContext = createContext(null);
const YorkieChangesContext = createContext<Array<Devtools.ChangeInfo>>(null);

type Props = {
  children?: ReactNode;
};

export function YorkieSourceProvider({ children }: Props) {
  const [currentDocKey, setCurrentDocKey] = useState<string>('');
  const [doc, setDoc] = useState(null);
  const [changes, setChanges] = useState<Array<Devtools.ChangeInfo>>([]);

  const handleSDKMessage = useCallback((message: SDKToPanelMessage) => {
    switch (message.msg) {
      case 'refresh-devtools':
        setCurrentDocKey('');
        setChanges([]);
        sendToSDK({ msg: 'devtools::connect' });
        break;
      case 'doc::available':
        setCurrentDocKey(message.docKey);
        sendToSDK({
          msg: 'devtools::subscribe',
          docKey: message.docKey,
        });
        break;
      case 'doc::sync::full':
        // TODO(chacha912): Notify the user that they need to use Yorkie-JS-SDK version 0.4.15 or newer.
        if (message.changes === undefined) break;
        setChanges(message.changes);
        break;
      case 'doc::sync::partial':
        if (message.changes === undefined) break;
        setChanges((changes) => [...changes, ...message.changes]);
        break;
    }
  }, []);

  const handlePortDisconnect = useCallback(() => {
    setCurrentDocKey('');
  }, []);

  useEffect(() => {
    connectPort(handleSDKMessage, handlePortDisconnect);

    const tabID = chrome.devtools.inspectedWindow.tabId;
    const handleInspectedTabUpdate = (id, { status }) => {
      // NOTE(chacha912): The inspected window is reloaded, so we should reconnect the port.
      if (status === 'complete' && tabID === id) {
        connectPort(handleSDKMessage, handlePortDisconnect);
      }
    };
    chrome.tabs.onUpdated.addListener(handleInspectedTabUpdate);
    return () => {
      chrome.tabs.onUpdated.removeListener(handleInspectedTabUpdate);
    };
  }, []);

  return (
    <DocKeyContext.Provider value={currentDocKey}>
      <YorkieChangesContext.Provider value={changes}>
        <YorkieDocContext.Provider value={[doc, setDoc]}>
          {children}
        </YorkieDocContext.Provider>
      </YorkieChangesContext.Provider>
    </DocKeyContext.Provider>
  );
}

export function useCurrentDocKey() {
  const value = useContext(DocKeyContext);
  if (value === undefined) {
    throw new Error(
      'useCurrentDocKey should be used within YorkieSourceProvider',
    );
  }
  return value;
}

export function useYorkieDoc() {
  const value = useContext(YorkieDocContext);
  if (value === undefined) {
    throw new Error('useYorkieDoc should be used within YorkieSourceProvider');
  }
  return value;
}

export function useYorkieChanges() {
  const value = useContext(YorkieChangesContext);
  if (value === undefined) {
    throw new Error(
      'useYorkieChanges should be used within YorkieSourceProvider',
    );
  }
  return value;
}
