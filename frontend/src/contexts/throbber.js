// Implements a context for showing a full screen 'Throbber' (i.e. loading icon).
//
// Usage in child component:
//      import { useThrobber } from '../contexts/throbber';
//      const setBusy = useThrobber();
//      ...
//      setBusy(<Boolean>);
//
// TODO:
// * Implement a message function

import React from 'react';
import Busy from '../components/busy';

// Create context
const ThrobberContext = React.createContext();

// Define hook
export function useThrobber() {
  const context = React.useContext(ThrobberContext);
  if (context === undefined) {
    throw new Error("useThrobber must be used within a ThrobberContext.Provider");
  }
  return context;
}

// Main component
export const Throbber = ({children}) => {

    const [busy, setBusy] = React.useState(false);

    function renderContent() {
        return (
            <Busy busy={busy} />
        );
    }

    return (
        <ThrobberContext.Provider value={setBusy}>
            {renderContent()}
            {children}
        </ThrobberContext.Provider>
    )

}
