import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
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
  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const currentView = useSelector(selectView);
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
