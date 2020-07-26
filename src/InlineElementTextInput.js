import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  makeStyles,
} from '@material-ui/core';
// import MogaoTextField from 'Components/MogaoTextField';
import DiffMatchPatch from 'diff-match-patch';
import PropTypes from 'prop-types';
import invariant from 'invariant';
// import DetectableElementDescriptors from './DetectableElementDescriptors';

const regexURL = /https?:\/\/[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*^)?\S+/;

const dmp = new DiffMatchPatch();

function DescriptionEntity(type, value) {
  // invariant(
  //     type === DescriptionEntityTypeForEditing.char || type === DescriptionEntityTypeForEditing.mention
  //     , `[MogaoDescriptionEntity] Invalid argument. 'type' must be one of [${DescriptionEntityTypeForEditing.char}, ${DescriptionEntityTypeForEditing.mention}]`
  // );

  // invariant(
  //     (type === DescriptionEntityTypeForEditing.char && typeof value === 'string')
  //     || (type === DescriptionEntityTypeForEditing.mention && typeof value === 'object')
  //     , `[MogaoDescriptionEntityForEditing] ${type === DescriptionEntityTypeForEditing.char ? 'The value of char type must be string.' : 'The value of mention type must be object.'}`
  // );

  this.type = type;
  this.value = value;
}

const useStyles = makeStyles(theme => ({
  defaultInput: {
    fontSize: '1rem',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeight: 400,
    lineHeight: '1.1875em',
    textAlign: 'start',
    whiteSpace: 'pre-wrap',
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    textTransform: 'none',
    overflowWrap: 'break-word',
    textIndent: 0,
    textShadow: 'none',
    textRendering: 'auto',
    padding: '1px 2px',
    border: '1px solid black',
    width: 250,
    maxHeight: 500
  },
  wordHighlight: {
    pointerEvents: 'none',
    overflow: "hidden",
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0.2, 0.2, 0.2, 0.2)',
    
    // right: 14,
    // bottom: 18.5,
  },
}));

function SelectionInfo(start, end) {
  this.start = start;
  this.end = end;
}

function IntermediateEntity(type, char, entityIndex, valueIndex, valueLength) {
  this.type = type;
  this.char = char;
  this.entityIndex = entityIndex;
  this.valueIndex = valueIndex;
  this.valueLength = valueLength;
}

const charType = 'char';

function getDescriptorByEntityType(elementDescriptors, entityType) {
  const descriptor = elementDescriptors.filter(desc => desc.name === entityType)[0];
  invariant(descriptor !== null && descriptor !== undefined, `[InlineElementTextInput] Invalid entytiType: ${entityType}`);
  return descriptor;
}

function InlineElementTextInput(props, ref) {
  const classes = useStyles();

  // 데이터 소스. plainText와 멘션 하이라이트 처리를 위한 html로 변환됨.
  // const [ongoingInlineElement, setOngoingInlineElement] = useState(null);

  const textAreaInput = useRef();
  const mentionShadowRef = useRef();
  const lastSelectionInfo = useRef(new SelectionInfo(0, 0));

  const { entityList, elementDescriptors } = props;

  // entityList와 plainText 만으로 멘션처리를 하기에는 이 둘의 길이가 달라서 인덱스 처리가 복잡하기 때문에
  // entityList <-> plainText 중간에 위치할 배열을 생성.
  // plainText의 길이와 동일하며, 각각의 원소는 타입과 하나의 문자 그리고 entityList에 대응되는 인덱스를 갖고 있음.
  // 멘션의 경우 멘션 길이, 멘션 인덱스를 추가로 가짐.

  const intermediateEntityList = [];

  for (let i = 0; i < entityList.length; i++) {
    const entity = entityList[i];
    let entityType = entity.type;

    if (entityType === charType) {
      intermediateEntityList.push(new IntermediateEntity(charType, entity.value, i));

    } else {
      const descriptor = getDescriptorByEntityType(elementDescriptors, entityType);
      const charArr = (descriptor.prefix + entity.value).split('');

      charArr
        .map((char, valueIndex) => new IntermediateEntity(entityType, char, i, valueIndex, charArr.length))
        .forEach(elem => intermediateEntityList.push(elem));
    }
  }

  // textarea에 보일 스트링
  const plainText = intermediateEntityList
    .map(e => e.char)
    .join('');

  // 하이라이트 처리를 위한 html
  const shadowHtml = entityList
    .map(entity => {
      const entityType = entity.type;
      if (entityType === charType) {
        return entity.value;
      } else {
        const descriptor = getDescriptorByEntityType(elementDescriptors, entityType);
        return `<span style="border-radius=2; background-color:${descriptor.highlightColor};">${descriptor.prefix}${entity.value}</span>`
      }
    })
    .join('') + '<br>';

  useEffect(() => {
    if (entityList.length === 0) {
      props.onDetectLink(null);
      return;
    }

    // 텍스트 내 url 찾기.
    const timer = setTimeout(() => {
      const result = regexURL.exec(plainText);

      if (result !== null && result.length > 0) {
        props.onDetectLink(result[0]);
      } else {
        props.onDetectLink(null)
      }
    }, 750);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityList]);

  useImperativeHandle(ref, () => ({
    highlightElement: (elemInfo) => {
      const elemType = elemInfo.type;
      const elemPrefix = elementDescriptors.filter(desc => desc.name === elemType)[0].prefix;

      const tempMentionLastIndex = intermediateEntityList[elemInfo.cursorPosition - 1].entityIndex;
      const tempMentionFirstIndex = tempMentionLastIndex - elemInfo.value.length - elemPrefix.length + 1;

      entityList.splice(tempMentionFirstIndex, elemInfo.newValue.length + 1);
      entityList.splice(tempMentionFirstIndex, 0, new DescriptionEntity(elemInfo.type, elemInfo.newValue));

      props.onChange([...entityList]);
      textAreaInput.current.focus();
    }
  }));

  function getEntityObjByStringIndex(strIndex) {
    if (strIndex < 0 || strIndex >= intermediateEntityList.length) {
      return null;
    }

    return entityList[intermediateEntityList[strIndex].entityIndex];
  }

  function handleOnScroll(e) {
    mentionShadowRef.current.scrollTop = e.target.scrollTop;
  }

  function handleOnChange(e) {
    const newValue = e.target.value;
    // console.time('diff');
    // diffResult에 따라 newEntityList 구성 -> 스테이트 변경.

    const newEntityList = [];
    const diffResult = dmp.diff_main(plainText, newValue);

    let curIndexOfIntermediateEntityList = 0;

    diffResult.forEach(diff => {
      const diffType = diff[0];
      const diffValue = diff[1];

      switch (diffType) {
        case DiffMatchPatch.DIFF_EQUAL:

          let i = 0;

          while (i < diffValue.length) {
            const curIntermediateEntity = intermediateEntityList[curIndexOfIntermediateEntityList + i];

            if (curIntermediateEntity.type === charType) {
              // char 처리
              newEntityList.push(new DescriptionEntity(charType, curIntermediateEntity.char));
              i++;

            } else {

              // mention: 두 가지 처리로 나뉨.
              //
              // 1. diffValue 안에 curIntermediateEntity와 짝이되는 모든 멘션 정보가 담겨 있는가?
              //    => ex) 원문       : 'Hello World *Tony*! *BG*! Nice to meet you!'
              //           diffValue : 'Hello World *Tony*' || '*BG* Nice to meet you!'
              //
              // 2. diffValue 안에 curIntermediateEntity와 짝이되는 모든 멘션 정보의 일부만 담겨 있는가?
              //    => ex) 원문       : 'Hello World *Tony*'
              //           diffValue : 'Hello world *To' || 'ny*'
              //
              // 1의 경우 이전 멘션의 정보를 그대로 newEntityList에 푸쉬.
              // 2의 경우 쪼개진 멘션 사이에 무언가가 인서트 되거나, 멘션의 일부가 삭제됐다는 의미이므로 일반 문자 타입으로 변환 후 newEntityList에 푸쉬함.

              const valueLength = curIntermediateEntity.valueLength;

              const containsAllMentionNameInThisDiffValue =
                curIntermediateEntity.valueIndex === 0
                && diffValue[i + valueLength - 1] !== undefined;

              if (containsAllMentionNameInThisDiffValue === true) {
                newEntityList.push(entityList[curIntermediateEntity.entityIndex]);
                i += curIntermediateEntity.valueLength;

              } else {
                let dividedMentionName = [];

                for (let j = i; j < diffValue.length; j++) {
                  // is jth char type?
                  const isJthCharType = intermediateEntityList[curIndexOfIntermediateEntityList + j].type === charType;

                  if (isJthCharType === true) {
                    break;
                  } else {
                    const jthChar = intermediateEntityList[curIndexOfIntermediateEntityList + j].char;
                    dividedMentionName.push(jthChar);
                  }
                }

                dividedMentionName.forEach(char =>
                  newEntityList.push(new DescriptionEntity(charType, char))
                );

                i += dividedMentionName.length;
              } // END if else

            } // END if else
          } // END while

          curIndexOfIntermediateEntityList += diffValue.length;
          break;

        case DiffMatchPatch.DIFF_INSERT:

          // diff 결과로 인서트가 발생하는 경우는 textarea에 직접 문자를 입력했을 때 뿐임.
          // 따라서 멘션 처리와 관계없이 새로운 TextEntity만 푸쉬함.

          for (let i = 0; i < diffValue.length; i++) {
            newEntityList.push(new DescriptionEntity(charType, diffValue[i]));
          }
          break;

        case DiffMatchPatch.DIFF_DELETE:

          // 삭제된 스트링은 newEntityList에 추가하지 않으면 됨.
          // 스트링에서 하나 이상의 문자를 삭제하면 두 개의 스트링으로 쪼개지거나 혹은 앞뒤가 삭제된 경우 하나의 스트링이 결과로 나오기 때문에
          // case EQUAL에서 처리 가능.

          curIndexOfIntermediateEntityList += diffValue.length;
          break;

        default:
          break;
      }
    });

    // console.timeEnd('diff');
    props.onChange(newEntityList);
  }

  function handleOnSelect(e) {
    // 커서 위치 혹은 selection range가 변경될 때마다 호출.
    function setNull() {
      props.onDetect(null);
    }

    lastSelectionInfo.current = new SelectionInfo(textAreaInput.current.selectionStart, textAreaInput.current.selectionEnd);

    if (entityList.length === 0) {
      return;
    }

    const selectionStart = textAreaInput.current.selectionStart;
    const selectionEnd = textAreaInput.current.selectionEnd;

    // 커서가 아닌 하나 이상의 문자가 selection 됐을 때는 멘션 처리 x
    if (selectionStart !== selectionEnd || selectionStart === 0) {
      setNull();
      return;
    }

    const isCursorPositionBeforeEndOfString = selectionStart < entityList.length;

    if (isCursorPositionBeforeEndOfString === true) {
      // 커서 위치가 스트링 중간에 있을 떄

      const entityObjAtSelectionStart = getEntityObjByStringIndex(selectionStart);
      const entityObjRightBeforeAtSelectionStart = getEntityObjByStringIndex(selectionStart - 1);

      const isVeryNextCharWhiteSpace =
        entityObjAtSelectionStart.type === charType
        && (entityObjAtSelectionStart.value === ' ' || entityObjAtSelectionStart.value === '\n');

      const isCurrentCharNewLine =
        entityObjAtSelectionStart.type === charType
        && entityObjRightBeforeAtSelectionStart.value === '\n';

      // 커서 바로 뒤는 공백이어야 하지만, 그것이 개행 문자라면 멘션 처리 x
      if (isVeryNextCharWhiteSpace === false || isCurrentCharNewLine === true) {
        setNull();
        return;
      }

    } else {
      // 커서 위치가 스트링 끝에 있을 때. (즉, string.length 위치에 있을 때)
      const entityObjRightBeforeAtSelectionStart = getEntityObjByStringIndex(selectionStart - 1);
      const isLastCharNewLine =
        entityObjRightBeforeAtSelectionStart.type === charType
        && entityObjRightBeforeAtSelectionStart.value === '\n';

      // 마지막 문자가 개행이면 멘션처리 x
      if (isLastCharNewLine === true) {
        setNull();
        return;
      }
    }

    // '@' 뒤에 있는 스트링이 maxLengthOfUsername을 초과하면 멘션 처리 x
    const maxLengthOfUsername = 32;
    let curTempMentionUsername = '';

    // 현재 커서 위치에서 -1씩 하면서 curTempMentionUsername 0번째에 인서트.
    // 그러다가 @를 만나면 curTempMentionuserName으로 친구 목록 검색.
    // 중간에 개행 문자 만나면 리턴.
    for (let i = 0; i < maxLengthOfUsername; i++) {
      const curIndex = selectionStart - i - 1;

      if (curIndex < 0) {
        setNull();
        break;
      }

      const entityObjAtCurIndex = getEntityObjByStringIndex(curIndex);
      if (entityObjAtCurIndex.type !== charType) {
        setNull();
        break;
      }

      if (entityObjAtCurIndex.char === '\n' || entityObjAtCurIndex.char === ' ') {
        setNull();
        break;
      }

      for (const descriptor of elementDescriptors) {
        const prefix = descriptor.prefix;
        if (prefix !== null) {
          let isMatched = true;

          for (let j = 0; j < prefix.length; j++) {
            const entityObjAtCurIndexMinusJ = getEntityObjByStringIndex(curIndex - j);

            if (entityObjAtCurIndexMinusJ === null) {
              setNull();
              return;
            }

            const charAtCurIndexMinusJ = entityObjAtCurIndexMinusJ.value;

            if (charAtCurIndexMinusJ === '\n' || charAtCurIndexMinusJ === ' ') {
              setNull();
              return;
            }

            if (prefix[prefix.length - 1 - j] !== charAtCurIndexMinusJ) {
              isMatched = false;
              break;
            }
          }

          if (isMatched === true) {
            props.onDetect({
              type: descriptor.name,
              value: curTempMentionUsername,
              cursorPosition: lastSelectionInfo.current.start
            });
            return;
          }
        }
      }// END for

      curTempMentionUsername = entityObjAtCurIndex.value + curTempMentionUsername;
    }
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          ref={mentionShadowRef}
          dangerouslySetInnerHTML={{ __html: shadowHtml }}
          className={`${classes.defaultInput} ${classes.wordHighlight} ${props.className || ''}`}
        />

        <textarea
          ref={textAreaInput}
          value={plainText}
          className={`${classes.defaultInput} ${props.className || ''}`}
          onScroll={handleOnScroll}
          onChange={handleOnChange}
          onSelect={handleOnSelect}
          onFocus={props.onFocus}
        />
      </div>
    </>
  );
}

const InlineElementTextInputWithRef = forwardRef(InlineElementTextInput);

InlineElementTextInputWithRef.propTypes = {
  elementDescriptors: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      prefix: PropTypes.string.isRequired,
      highlightColor: PropTypes.string,
    }).isRequired
  ).isRequired,

  entityList: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }).isRequired
  ).isRequired,

  onChange: PropTypes.func.isRequired,
  onDetect: PropTypes.func.isRequired,
  onDetectLink: PropTypes.func.isRequired,

  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string
};

export default InlineElementTextInputWithRef;