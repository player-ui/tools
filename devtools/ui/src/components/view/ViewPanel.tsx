import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View } from '@player-ui/types';
import {
  StoreState,
  selectSelectedPlayerId,
  selectView,
  GET_VIEW_DETAILS,
} from '@player-tools/devtools-client';
import { ViewInspector } from './ViewInspector';
import styles from '../app.css';

/**
 * Displays the view panel for a player instance.
 * @returns
 */
export const ViewPanel = () => {
  const currentPlayerID = useSelector<StoreState, string | null>(
    selectSelectedPlayerId
  );
  const currentView = useSelector<StoreState, View | undefined | null>(
    selectView
  );
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!currentPlayerID) {
      return;
    }

    dispatch({
      type: GET_VIEW_DETAILS,
      payload: { playerID: currentPlayerID },
    });
  }, [currentPlayerID, dispatch]);

  if (!currentView) {
    return <div className={styles.noData}>No view details available</div>;
  }

  return <ViewInspector currentView={currentView} />;
};
