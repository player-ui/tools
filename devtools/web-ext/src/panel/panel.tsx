import React from 'react';
import ReactDom from 'react-dom';
import { AutoThemeProvider } from '@devtools-ds/themes';
import { App } from '@player-tools/devtools-ui';
import { proxyStore } from '../redux/proxy-store';
import './global.css';

const ele = document.createElement('div');
document.body.appendChild(ele);

proxyStore
    .ready()
    .then(() => ReactDom.render(
        <AutoThemeProvider autoStyle>
            <App store={proxyStore} />
        </AutoThemeProvider >, ele));
