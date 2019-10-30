/* global xbayCommon Sk $ */
import { useRef } from 'react';

Sk.domOutput = html => {
    const $output = $('#chart-output');

    if ($output.width() > 200) {
        Sk.availableWidth = $output.width();
    } else {
        setTimeout(() => {
            $output
                .find('div')
                .first()
                .addClass('overflow-auto');
        }, 1000);
    }
    $output.empty();

    return $output
        .append(html)
        .children()
        .last();
};

export const configSkulpt = ({
    builtinRead,
    handleOutput,
    code,
    canvasTarget,
    onAfterImport,
    filewrite,
    fileopen,
}) => {
    Sk.configure({
        output: handleOutput,
        read: builtinRead,
        __future__: Sk.python3,
        execLimit: 60000,
        killableWhile: true,
        killableFor: true,
        timeoutMsg: () => '运行超时',
        inputfunTakesPrompt: true,
        nonreadopen: true,
        filewrite,
        fileopen,
    });

    Sk.onAfterImport = onAfterImport;

    if (!Sk.TurtleGraphics) {
        Sk.TurtleGraphics = {};
    }
    Sk.builtin.KeyboardInterrupt = function(...args) {
        let o;
        if (!(this instanceof Sk.builtin.KeyboardInterrupt)) {
            o = Object.create(Sk.builtin.KeyboardInterrupt.prototype);
            o.constructor(...args);
            return o;
        }
        Sk.builtin.BaseException.apply(this, args);
    };
    Sk.abstr.setUpInheritance(
        'KeyboardInterrupt',
        Sk.builtin.KeyboardInterrupt,
        Sk.builtin.BaseException,
    );
    const ctarget = document.getElementById(canvasTarget);
    Sk.TurtleGraphics.target = canvasTarget;

    if (ctarget && ctarget.clientWidth && ctarget.clientHeight) {
        Sk.TurtleGraphics.width = ctarget.clientWidth;
        Sk.TurtleGraphics.height = ctarget.clientHeight;
    }

    const interruptHandler = () => {
        if (Sk.hardInterrupt === true) {
            throw new Sk.builtin.KeyboardInterrupt('aborted execution');
        } else {
            return null; // should perform default action
        }
    };

    return Sk.misceval
        .asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true), {
            '*': interruptHandler,
        })
        .catch(err => {
            if (!(err instanceof Sk.builtin.KeyboardInterrupt)) {
                handleOutput(err.toString());
            } else {
                Sk.hardInterrupt = false;
            }
            throw err;
        });
};

export const useBuiltinRead = codeFilesRef => {
    const fetchingDeps = useRef(false);
    const addedDepsRef = useRef();
    const externalLibCacheRef = useRef({});

    const builtInFiles = {
        'src/builtin/__testHelper__.py':
            'import sys\nfrom StringIO import StringIO\nclass Capturing(list):\n  def __enter__(self):\n    self._stdout = sys.stdout\n    sys.stdout = self._stringio = StringIO()\n    return self\n  def __exit__(self, *args):\n    self.extend(self._stringio.getvalue().splitlines())\n    del self._stringio\n    sys.stdout = self._stdout',
    };
    const externalLibs = {
        'src/builtin/pygal/__init__.js': {
            path: 'https://assets.baydn.com/baydn/public/pygal/1.0.0/__init__.js',
            dependencies: [
                'https://assets.baydn.com/baydn/public/highcharts/7.1.1/highcharts.js',
                'https://assets.baydn.com/baydn/public/highcharts/7.1.1/highcharts-more.js',
            ],
        },
    };

    const appendScripts = scripts => {
        scripts.map(script => {
            const scriptElement = document.createElement('script');
            scriptElement.type = 'text/javascript';
            scriptElement.text = script;
            document.getElementsByTagName('head')[0].appendChild(scriptElement);
            // eslint-disable-next-line no-useless-return
            return;
        });
    };
    const fetchDeps = fileName => {
        if (fetchingDeps.current) return;
        if (addedDepsRef.current) {
            return Promise.resolve();
        }

        fetchingDeps.current = true;
        return Promise.all(
            externalLibs[fileName].dependencies.map(dep => {
                return fetch(dep).then(r => r.text());
            }),
        ).then(scripts => {
            appendScripts(scripts);
            addedDepsRef.current = true;
            fetchingDeps.current = false;
        });
    };

    const fetchExternalLib = path => {
        if (externalLibCacheRef.current[path]) {
            return Promise.resolve(externalLibCacheRef.current[path]);
        }
        return fetch(path).then(r => {
            const text = r.text();
            externalLibCacheRef.current = { [path]: text };
            return text;
        });
    };
    const builtinRead = x => {
        const fileName = x.replace('./', '');
        const file = codeFilesRef.current.find(item => item.name === fileName);

        if (file) {
            return file.code;
        }
        const files = Object.assign({}, Sk.builtinFiles.files, builtInFiles);

        if (!files[fileName] && fileName in externalLibs) {
            return Sk.misceval.promiseToSuspension(
                fetchDeps(fileName).then(() => fetchExternalLib(externalLibs[fileName].path)),
            );
        }

        if (!files || !files[x]) throw new Error(`File not found: '${x}'`);
        return files[x];
    };

    return builtinRead;
};

export const useCodeEditor = (codeFiles, setCodeFiles, codeFilesRef, setIsGraph, setIsChart) => {
    const setCodeFilesAndRef = data => {
        setCodeFiles(data);
        codeFilesRef.current = data;
        console.log(data);
    };

    const handleFileOpen = file => {
        const name = file.name.replace('./', '');
        const codeFile = codeFilesRef.current.find(item => item.name === name);

        if (!codeFile && (file.mode.v === 'w' || file.mode.v === 'a')) {
            setCodeFilesAndRef([
                ...codeFilesRef.current,
                {
                    name: file.name,
                    code: '',
                },
            ]);
        }
    };

    const handleFileWrite = (file, str) => {
        const name = file.name.replace('./', '');
        const codeFile = codeFilesRef.current.find(item => item.name === name);

        if (codeFile) {
            if (typeof str.v === 'string') {
                if (file.mode.v === 'a') {
                    codeFile.code += str.v;
                } else {
                    codeFile.code = str.v;
                }
                setCodeFilesAndRef(codeFilesRef.current);
            } else {
                throw new Sk.builtin.TypeError(
                    'expected a string or other character buffer object',
                );
            }
        } else {
            throw new Sk.builtin.IOError('file has been deleted, cannot write.');
        }
    };
    const handleAfterImport = library => {
        switch (library) {
            case 'turtle':
                setIsGraph(true);
                break;
            case 'pygal':
                setIsGraph(true);
                setIsChart(true);
                break;
            default:
                break;
        }
    };

    const handleCodeChange = (name, code) => {
        const oldCode = codeFiles.find(el => el.name === name).code;

        const arr = ['，', '‘', '’', '：', '“', '”', '（', '）', '；'];
        if (oldCode.length < code.length) {
            for (let i = 0; i < code.length; i++) {
                if (oldCode[i] !== code[i]) {
                    const change = code.slice(i, i + code.length - oldCode.length);
                    for (i = 0; i < change.length; i++) {
                        if (arr.indexOf(change[i]) !== -1) {
                            xbayCommon.notify('注意：你刚刚输入了中文字符', 2000);
                        }
                    }
                    break;
                }
            }
        }
    };



    return {
        setCodeFilesAndRef,
        handleFileOpen,
        handleFileWrite,
        handleAfterImport,
        handleCodeChange
    };
};