import {FC} from "react";

interface progressBarProps{
    progressOverUnder:string
}
export const ProgressBar:FC<progressBarProps> = ({progressOverUnder}) => {

    return (
        <div className="dice-progress-bar-container">
            <div className="dice-progress-bar-value-container">
                {[3,10.5,18].map((value, index) => (
                    <div className={`dice-progress-bar-value ${value===10.5 ? "dice-align-center" : (value===18 ? "dice-align-right":"")}`} key={index}
                         style={{
                             color:value===10.5 ? "white":""
                    }}>
                        {value}
                    </div>
                ))}
            </div>

            <div className="dice-progress-bar">
                <div className={`dice-progress-bar-under-over ${progressOverUnder === "under" ? "under-active":""}`}></div>

                <div className="progress-slider"
                     style={{
                         color: progressOverUnder === "over" ? "black" : "white",
                         backgroundImage: progressOverUnder === "over"
                             ? "linear-gradient(to right, #4facfe 0%, #00f2fe 100%)"
                             : "linear-gradient(-225deg, #7742B2 0%, #F180FF 52%, #FD8BD9 100%)"
                     }}
                ></div>
                <div className={`dice-progress-bar-under-over ${progressOverUnder === "over" ? "over-active":""}`}></div>

            </div>
        </div>


    )
}
