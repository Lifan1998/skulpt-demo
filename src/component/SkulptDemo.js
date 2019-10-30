/* global Prism Sk */
import React, { useState, useEffect, Fragment, useRef } from 'react';

import $ from 'jquery';
import classNames from 'classnames';

import ReactMarkdown from 'react-markdown';
import Notification from 'rc-notification';

import CodeEditor from '../code-editor/mobile';
import ExerciseHintCard from './util/HintCard';
import {
    configSkulpt,
    useBuiltinRead,
    useCodeEditor,
} from './util/SkulptImport';

import './SkulptDemo.scss';

let notification = null;
Notification.newInstance(
    {
        prefixCls: 'exercise-hint',
        style: { position: 'fixed', top: 5, left: 18, right: 18 },
    },
    n => {
        notification = n;
    },
);

const Exercise = props => {

    const [codeFiles, setCodeFiles] = useState([]);
    const [result, setResult] = useState('');
    const [isGraph, setIsGraph] = useState(false);
    const [isChart, setIsChart] = useState(false);
    const [codeStatus, setCodeStatus] = useState('');
    const [failedTimesCount, setFailedTimesCount] = useState(0);
    const codeFilesRef = useRef([{name: 'main.py', code:'print "Hello World"'}]);
   
    const isRun = useRef(false);
    const [isRunStatus, setIsRunStatus] = useState(false);
    const [isShowAnswer, setIsShowAnswer] = useState(false);
    const [templateCodeIndex, setTemplateCodeIndex] = useState(0);

    const hint = "";
    const instruction = "Python Code Editor";
    const templateCode = [
        [{ name: "main.py", code: "import pygal\nradar_chart = pygal.Radar()\nradar_chart.title = '餐厅评分数据'\nradar_chart.x_labels = ['味道', '卫生', '服务', '价格', '环境']\nradar_chart.add('老王炸鸡', [9, 6, 6, 4, 7])\nradar_chart.add('小明快餐', [7, 8, 9, 6, 8])\nradar_chart.add('阿强烧烤', [10, 4, 6, 8, 4])\nradar_chart.add('萌仔汉堡', [7, 6, 5, 4, 6])\nradar_chart.render()" }],
        [{ name: 'main.py', code: "import turtle \n\nstar = turtle.Turtle()\n\n\ndef draw_star(*args):\n  for argument in args:\n    star.pencolor(argument)\n    for i in range(5):\n      star.forward(80)\n      star.right(144)\ndraw_star('green','blue','yellow','pink','red','purple','orange')    \nturtle.done()\n"}],
        [{ name: 'main.py', code: "import pygal\nline_chart = pygal.Line()\nline_chart.title = '泰坦尼克号不同上船点乘客幸存数据'\nline_chart.x_labels = map(str, ['Queenstown','Cherbourg','Southampton'])\nline_chart.add('幸存者',[30, 93, 217])\nline_chart.add('遇难者',[47, 75, 427])\nline_chart.render()"}],
        [{ name: 'main.py', code: "import pygal\nbar_chart = pygal.Bar()\nbar_chart.title = '泰坦尼克号乘客所在船舱统计'\nbar_chart.x_labels = map(str, ['一等舱','二等舱','三等舱'])\nbar_chart.add('幸存者', [136,87,119])\nbar_chart.add('遇难者', [80,97,372])\nbar_chart.render()"}]
    ];


    const builtinRead = useBuiltinRead(codeFilesRef);
    const {
        setCodeFilesAndRef,
        handleFileOpen,
        handleFileWrite,
        handleAfterImport,
        handleCodeChange,
        handleOnClickPunctuation,
    } = useCodeEditor(codeFiles, setCodeFiles, codeFilesRef, setIsGraph, setIsChart);
    
    let resultHints = [];
    let userCodeStatus = '';
    let buffer = '';
    useEffect(() => {
        const resetData = () => {
            setFailedTimesCount(0);
            setCodeStatus('');
            setResult('');
            setIsGraph(false);
            setIsChart(false);
        };
        setCodeFilesAndRef(templateCode[templateCodeIndex]);
        (async () => {
            Prism.highlightAll();
            document.getElementsByClassName('code-editor')[0].scrollIntoView();
        })();

        return () => {
            resetData();
        };
    }, []);

   
    const handleOutput = text => {
        buffer += text;
        $('.console-output').text(buffer);
        setResult(buffer);
    };

    const handleRemoveHintModal = () => {
        notification.removeNotice('exercise-hint');
    };

    const handleUseAnswer = () => {
        setCodeFilesAndRef(JSON.parse(JSON.stringify(templateCode[templateCodeIndex])));
        setIsShowAnswer(false);
    };

    const handleShowAnswer = () => {
        setIsShowAnswer(true);
        Prism.highlightAll();
    };

    const handleSelectTemplateCode = (index) => {
        setTemplateCodeIndex(index);
        Prism.highlightAll();
    }

    const handleHideAnswerModel = () => {
        setIsShowAnswer(false);
    };

    const handleRun = async () => {
        if (isRun.current === true) {
            Sk.hardInterrupt = true;
            return;
        }
        Sk.hardInterrupt = false;
        isRun.current = true;
        const timer = setTimeout(() => {
            if (isRun.current) {
                setIsRunStatus(true);
            }
        }, 1500);

        buffer = '';
        setResult('');
        setIsGraph(false);
        setIsChart(false);

        const codeFile = codeFilesRef.current.find(item => item.name === 'main.py');
        const code = codeFile && codeFile.code;

        if (code) {
            $('html, body').animate({ scrollTop: $(document).height() }, 'slow');
            try {
                await configSkulpt({
                    handleOutput,
                    builtinRead,
                    canvasTarget: 'graph-output',
                    code,
                    onAfterImport: handleAfterImport,
                    filewrite: handleFileWrite,
                    fileopen: handleFileOpen,
                });
            } catch (e) {
                userCodeStatus = 'IS_SYNTAX_ERROR';
                setFailedTimesCount(c => c + 1);
                console.log(e);
            } finally {
                isRun.current = false;
                setIsRunStatus(false);
            
                handleRemoveHintModal();
                userCodeStatus !== 'IS_RIGHT' &&
                    notification.notice({
                        content: (
                            <ExerciseHintCard
                                userCodeStatus={userCodeStatus}
                                resultHints={resultHints}
                                failedTimesCount={failedTimesCount}
                                hint={hint}
                                onClose={handleRemoveHintModal}
                            />
                        ),
                        duration: null,
                        closable: true,
                        key: 'exercise-hint',
                    });
                Prism.highlightAll();
                setCodeStatus(userCodeStatus);
            }
        } else {
            isRun.current = false;
            setIsRunStatus(false);
        }
        clearTimeout(timer);
    };

  
    const handleReset = () => {
        setCodeFilesAndRef(JSON.parse(JSON.stringify([{name: 'main.py', code: "# print('Hello World!')"}])));
    };

    return (
        <div className={`exercise-page`}>
            
            <div className="content">
                <div className="markdown-content" >{instruction}</div>
                <div className="label-wrapper">
                    <div className="label">编辑区</div>
                    <CodeEditor
                        files={codeFiles}
                        onChange={setCodeFilesAndRef}
                        height="300px"
                        onCodeChange={handleCodeChange}
                        handleOnClickPunctuation={handleOnClickPunctuation}
                    />
                </div>
                <div className="operations">
                    <div className="op-left">
                        
                        <Fragment>
                            <div className="btn btn-secondary" onClick={handleReset}>
                                <div className="btn-content">
                                    <img
                                        src="https://media-image1.baydn.com/storage_media_image/ylfnkj/5c429fe8fd22c8ff92f53de47e17e381.156c6357e10ee94783eda9e5a6b12727.png"
                                        alt="reset"
                                        className="icon"
                                        width={20}
                                        height={20}
                                    />
                                    清空
                                </div>
                            </div>
                            <div
                                    className="btn btn-secondary"
                                    onClick={handleShowAnswer}
                                >
                                    <div className="btn-content">
                                        <img
                                            src="https://media-image1.baydn.com/storage_media_image/ylfnkj/f90b814447916d4bae40b44b2d3906d9.74306a26bfa4a8e19c2a79cd7cc9b302.png"
                                            alt="answer"
                                            className="icon"
                                            width={20}
                                            height={20}
                                        />
                                        查看示例
                                    </div>
                                </div>
                        </Fragment>
                        
                    </div>
                    {(
                        <div className="btn btn-primary" onClick={handleRun}>
                            <div className="btn-content">
                                
                                <img
                                    src="https://media-image1.baydn.com/storage_media_image/ylfnkj/e2cc39bbaaf5e9d311617b11d9229e67.8460ee35470f7d043612aece864a794f.gif"
                                    alt="run"
                                    className="icon"
                                    width={10}
                                    height={12}
                                    style={{
                                        display: `${
                                            isRunStatus
                                                ? 'inline'
                                                : 'none'
                                        }`,
                                    }}
                                />
                                <img
                                    src="https://media-image1.baydn.com/storage_media_image/srfeae/ffe06905a8a67e68401aa60d21ffdd66.045c5a4c26b647c05ee473875dddf366.png"
                                    alt="run"
                                    className="icon"
                                    width={10}
                                    height={12}
                                    style={{
                                        display: `${isRunStatus ? 'none' : 'inline'}`,
                                    }}
                                />
                                {isRunStatus
                                    ? '停止'
                                    : '运行'}
                            </div>
                        </div>
                    )}
                </div>
                <div className="label-wrapper">
                    <div className="label">运行结果</div>
                    <div className="output-area">
                        <pre className={classNames('console-output', { hide: isGraph })}>
                            {result}
                        </pre>
                        <div
                            id="graph-output"
                            className={classNames({ hidden: !isGraph || isChart })}
                        />
                        <div
                            id="chart-output"
                            className={classNames({ hide: !isGraph || !isChart })}
                        />
                    </div>
                </div>
            </div>
            <div className="code-files hide">
                {codeFiles.map(file => (
                    <div id={file.name} key={file.name}>
                        {file.code}
                    </div>
                ))}
            </div>

            <div className={`show-answer ${isShowAnswer ? 'show' : 'hide'}`}>
                <div className="show-answer-model">
                    <div className="code-editor-wrap">
                        <div className="markdown-warp">
                            <ReactMarkdown
                                source={`\`\`\`python\n${templateCode[templateCodeIndex] &&
                                    JSON.parse(JSON.stringify(templateCode[templateCodeIndex][0])).code}\n\`\`\``}
                            />
                        </div>
                        {}
                        <div className="use-answer" onClick={() => handleSelectTemplateCode(0)}>
                            分布图
                        </div>
                        <div className="use-answer" onClick={() => handleSelectTemplateCode(1)}>
                            动画图
                        </div>
                        <div className="use-answer" onClick={() => handleSelectTemplateCode(2)}>
                            折线图
                        </div>
                        <div className="use-answer" onClick={() => handleSelectTemplateCode(3)}>
                            柱形图
                        </div>
                    </div>
                    <div className="use-answer-yes" onClick={handleUseAnswer}>
                            <span>使用</span>
                    </div>
                    <i className="ib ib-times-circle-o" onClick={handleHideAnswerModel} />
                </div>
            </div>
        </div>
    );
};

Exercise.defaultProps = {
};

Exercise.propTypes = {
};

export default Exercise;
