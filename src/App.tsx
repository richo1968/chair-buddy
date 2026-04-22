import { AppProvider, useApp } from '@/state/AppProvider';
import { HomeScreen } from '@/screens/HomeScreen';
import { NewGameScreen } from '@/screens/NewGameScreen';
import { GameScreen } from '@/screens/GameScreen';
import { ReviewScreen } from '@/screens/ReviewScreen';

function Router() {
  const { state } = useApp();
  if (!state.loaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg text-fg">
        <div className="text-muted-fg">Loading…</div>
      </div>
    );
  }
  switch (state.view) {
    case 'home':
      return <HomeScreen />;
    case 'setup':
      return <NewGameScreen />;
    case 'game':
      return <GameScreen />;
    case 'review':
      return <ReviewScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
