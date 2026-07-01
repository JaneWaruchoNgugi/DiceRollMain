import './App.css'
import './assets/infinity-dice.css'
import {DiceGameProvider} from "./Game/DiceGameContext.tsx";
import {GameHeader} from "./Components/GameHeader.tsx";
import {GameScreen} from "./Screens/GameScreen.tsx";

function App() {
    return (
        <DiceGameProvider>
            <div className="id-app">
                <GameHeader/>
                <main className="id-main">
                    <GameScreen/>
                </main>
            </div>
        </DiceGameProvider>
    );
}

export default App
