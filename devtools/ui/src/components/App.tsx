import React from 'react';
import { Sidebar } from './sidebar';
import { PanelNavigation } from './panel-navigation';
import styles from './app.css';
import { Store } from 'redux';
import { Provider } from 'react-redux';
import { AutoThemeProvider } from '@devtools-ds/themes';
import { ChakraProvider } from '@chakra-ui/react';

// TODO: I would love to just use a provider for this, but it wasn't working with the bundle :(
interface AppProps {
  store: Store;
}

/**
 * Root component for the panel.
 * @returns
 */
export const App = ({ store }: AppProps) => (
  <Provider store={store}>
    <AutoThemeProvider autoStyle>
      <ChakraProvider>
        <div className={styles.app}>
          <div className={styles.sidebar}>
            <Sidebar />
          </div>
          <div className={styles.contentWrapper}>
            <PanelNavigation />
          </div>
        </div>
      </ChakraProvider>
    </AutoThemeProvider>
  </Provider>
);
