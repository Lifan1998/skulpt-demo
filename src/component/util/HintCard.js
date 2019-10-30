import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';

import './HintCard.scss';

const HintCard = props => {
    const { userCodeStatus, resultHints, failedTimesCount, hint, onClose } = props;

    HintCard.handleClickOutside = () => onClose();

    return (
        <div className={`hint-card-wrapper ${userCodeStatus.toLowerCase()}`} onClick={onClose}>
            <div className="hint-card">
                <img
                    className={`${resultHints.length ? 'wrong-hint-img' : ''}`}
                    src={
                        userCodeStatus === 'IS_SYNTAX_ERROR'
                            ? 'https://media-image1.baydn.com/storage_media_image/vryjyo/facf8d934d7f159888e5f0214839b4c4.5fc7b981d0ff08b9b3b4cca8fd7d23b2.png'
                            : 'https://media-image1.baydn.com/storage_media_image/vryjyo/52998248f888eb4d55b53ebf07b393f8.83a399cfebe0070a6dc0240ebfca92cc.png'
                    }
                    alt=""
                />
                <ul className="result-hints">
                    <li className="title">
                        {userCodeStatus === 'IS_SYNTAX_ERROR'
                            ? '运行失败'
                            : '运行成功'}{' '}
                    </li>
                    {resultHints.map(item => (
                        <li key={item} className={`item ${userCodeStatus.toLowerCase()}`}>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            {failedTimesCount >= 2 && hint && (
                <div className="extra-hint">
                    <p className="title">你好像遇到了什么问题 , 让小贝来给你一点提示吧~</p>
                    <ReactMarkdown className="markdown-content" source={hint} />
                </div>
            )}
        </div>
    );
};

HintCard.defaultProps = {
    onClose: () => {},
};

HintCard.propTypes = {
    userCodeStatus: PropTypes.string.isRequired,
    resultHints: PropTypes.array.isRequired,
    failedTimesCount: PropTypes.number.isRequired,
    hint: PropTypes.string.isRequired,
    onClose: PropTypes.func,
    isReactComponent: true
};

export default HintCard;