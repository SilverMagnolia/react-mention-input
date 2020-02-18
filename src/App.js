import React, {useState, useRef} from 'react';
import './App.css';
import {
  TextField,
  Button,
  makeStyles
} from '@material-ui/core';
import DiffMatchPatch from 'diff-match-patch';
const dmp = new DiffMatchPatch();

const useStyles = makeStyles(theme => ({
  wrapper: {
     width: 250,
     position: 'relative',
  },
  mentionShadow: {
    // material ui outlined textfield 스타일 그대로 적용.
    fontSize: '1rem',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeight: 400,
    lineHeight: '1.1875em',
    textAlign: 'start',
    whiteSpace: 'pre-wrap',
    overflow: 'scroll',
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    textTransform: 'none',
    overflowWrap: 'break-word',
    textIndent: 0,
    textShadow: 'none',
    textRendering: 'auto',
    color: 'transparent',

    position: 'absolute',
    top: 18.5,
    left: 14,
    right: 14,
    bottom: 18.5,
  },
  mentionHighlight: {
    backgroundColor: '#d8dfea',
  },
}));

function Friend(name, id) {
  this.name = name;
  this.id = id;
}

const friends = [
  new Friend('Jongho', 110999111),
  new Friend('Ju Hyungmi', 9826351111),
  new Friend('Ju Homin', 112),
  new Friend('Jo Guk', 133),
  new Friend('KimJungUn', 141),
  new Friend('Kim Hyoung Leen', 199941),
  new Friend('MunJaeIn', 123123),
  new Friend('LeeMyoungBak', 112244),
  new Friend('NoTaeWoo', 12343),
  new Friend('NoMuHyoung', 8765),
  new Friend('Adele', 578),
  new Friend('AxlRose', 9876),
  new Friend('Booda', 77008),
  new Friend('Jesus', 9975),
  new Friend('Michael Jackson', 7654213),
];

function SelectionInfo(start, end) {
  this.start = start;
  this.end = end;
}

const EntityType = {
  char: 'char',
  mention: 'mention'
};

function TextEntity(type, value) {
  this.type = type;
  this.value = value;

  if (type === EntityType.char) {
    this.length = value.length;  
  } else if (type === EntityType.mention) {
    this.length = value.name.length;
  }
}

function App() {
  const classes = useStyles();

  const [tempMentionUsername, setTempMentionUsername] = useState(null);

  // 데이터 소스. plainText와 멘션 하이라이트 처리를 위한 html로 변환됨.
  const [entityList, setEntityList] = useState([]);

  const textAreaInput = useRef();
  const mentionShadowRef = useRef();
  const lastSelectionInfo = useRef(new SelectionInfo(0, 0));

  // entityList와 plainText 만으로 멘션처리를 하기에는 이 둘의 길이가 달라서 인덱스 처리가 복잡하기 때문에
  // entityList <-> plainText 중간에 위치할 배열을 생성.
  // plainText의 길이와 동일하며, 각각의 원소는 타입과 하나의 문자 그리고 entityList에 대응되는 인덱스를 갖고 있음.
  // 멘션의 경우 멘션 길이, 멘션 인덱스를 추가로 가짐.
  const intermediateEntityList = entityList
    .flatMap((entity, entityIndex) => {
      if (entity.type === EntityType.char) {
        return {value: entity.value, type: EntityType.char, entityIndex};
      } else /* mention */ {
        const charArr = (entity.value.name).split('');
        return charArr.map((char, mentionIndex) => ({value: char, type: EntityType.mention, entityIndex, mentionIndex, mentionLength: charArr.length}));
      }
    });
  
  // textarea에 보일 스트링
  const plainText = intermediateEntityList
    .map(e => e.value)
    .join('');

  // 멘션 하이라이트 처리를 위한 html
  const mentionShadowHtml = entityList
    .map(entity => {
      if (entity.type === EntityType.char) {
        return entity.value;
      } else {
        return `<span class="${classes.mentionHighlight}">${entity.value.name}</span>`
      }
    })
    .join('')+'<br>';

  function getEntityObjByStringIndex(strIndex) {
    if (strIndex < 0 || strIndex >= intermediateEntityList.length) {
      return null;
    }

    return entityList[intermediateEntityList[strIndex].entityIndex];
  }

  return (
    <div className="App">
      <div style={{fontSize: 20, fontWeight: 'bold', color: 'red', height: 100}}>
        {tempMentionUsername || 'null'}
      </div>

      <div className={classes.wrapper}>

        <div 
          ref={mentionShadowRef}
          dangerouslySetInnerHTML={{__html: mentionShadowHtml}}
          className={classes.mentionShadow}
        />
        
        <TextField
          inputRef={textAreaInput}
          label='description'
          variant="outlined"
          fullWidth 
          multiline
          rowsMax={10}
          inputProps={{
            spellCheck: false,
          }}
          value={plainText}
          onScroll={(e) => mentionShadowRef.current.scrollTop = e.target.scrollTop}
          onChange={(e) => {

            console.time('diff');

            // diffResult에 따라 newEntityList 구성 -> 스테이트 변경. 

            const newValue = e.target.value;
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

                    if (curIntermediateEntity.type === EntityType.char) {
                      // char 처리
                      newEntityList.push(new TextEntity(EntityType.char, curIntermediateEntity.value));  
                      i++;

                    } else if (curIntermediateEntity.type === EntityType.mention) {

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
                      
                      const mentionLength = curIntermediateEntity.mentionLength;

                      const containsAllMentionNameInThisDiffValue = 
                        curIntermediateEntity.mentionIndex === 0 
                        && diffValue[i + mentionLength - 1] !== undefined;
                        
                      if (containsAllMentionNameInThisDiffValue === true) {
                        newEntityList.push(entityList[curIntermediateEntity.entityIndex]);  
                        i += curIntermediateEntity.mentionLength;

                      } else {
                        let dividedMentionName = [];
                        for (let j = i; j < diffValue.length; j++) {
                          const isJthCharMention = intermediateEntityList[curIndexOfIntermediateEntityList + j].type === EntityType.mention;

                          if (isJthCharMention) {
                            const jthChar = intermediateEntityList[curIndexOfIntermediateEntityList + j].value;
                            dividedMentionName.push(jthChar);
                          } else {
                            break;
                          }
                        }

                        dividedMentionName.forEach(char => 
                          newEntityList.push(new TextEntity(EntityType.char, char))
                        );

                        i += dividedMentionName.length;
                      }
                    }
                  }

                  curIndexOfIntermediateEntityList += diffValue.length;
                  break;

                case DiffMatchPatch.DIFF_INSERT:
                  
                  // diff 결과로 인서트가 발생하는 경우는 textarea에 직접 문자를 입력했을 때 뿐임.
                  // 따라서 멘션 처리와 관계없이 새로운 TextEntity만 푸쉬함.

                  for (let i = 0; i < diffValue.length; i++) {
                    newEntityList.push(new TextEntity(EntityType.char, diffValue[i]));
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

            console.timeEnd('diff');
            setEntityList(newEntityList);
          }}
          
          onSelect={() => {
            
            // 커서 위치 혹은 selection range가 변경될 때마다 호출.
            // '@' 뒤에 스트링을 입력하면 멘션을 입력하려는 의도라 보고 커서가 바로 그 뒤에 있을 때 친구 리스트를 보여줌.

            function setNull() {
              if (tempMentionUsername !== null) {
                setTempMentionUsername(null);
              }
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
                entityObjAtSelectionStart.type === EntityType.char 
                && (entityObjAtSelectionStart.value === ' ' || entityObjAtSelectionStart.value === '\n');

              const isCurrentCharNewLine = 
                entityObjAtSelectionStart.type === EntityType.char 
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
                entityObjRightBeforeAtSelectionStart.type === EntityType.char 
                && entityObjRightBeforeAtSelectionStart.value === '\n';

              // 마지막 문자가 개행이면 멘션처리 x
              if (isLastCharNewLine === true) {
                setNull();
                return;
              }
            }

            // '@' 뒤에 있는 스트링이 maxLengthOfUsername을 초과하면 멘션 처리 x
            const maxLengthOfUsername = 64;
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
              if (entityObjAtCurIndex.type !== EntityType.char) {
                setNull();
                break;
              }

              if (entityObjAtCurIndex.value === '@') {
                if (curTempMentionUsername.length > 0) {
                  setTempMentionUsername(curTempMentionUsername);
                } else if (tempMentionUsername !== null) {
                  setTempMentionUsername(null);
                }

                break;

              } else if (entityObjAtCurIndex.value === '\n') {
                setNull();
                break;
              }

              curTempMentionUsername = entityObjAtCurIndex.value + curTempMentionUsername;
            }
          }}
        />
      </div>

      {tempMentionUsername !== null &&
        <FriendList 
          onClick={(friend) => {            
            const selectionStart = lastSelectionInfo.current.start;
            const tempMentionLastIndex = intermediateEntityList[selectionStart - 1].entityIndex;
            const tempMentionFirstIndex = tempMentionLastIndex - tempMentionUsername.length;

            // @tempMentionUsername 문자열 제거 -> Mention Obj로 대체
            entityList.splice(tempMentionFirstIndex, tempMentionUsername.length + 1);
            entityList.splice(tempMentionFirstIndex, 0, new TextEntity(EntityType.mention, friend));
            setEntityList([...entityList]);
          }}
          username={tempMentionUsername}
        />
      }

      <Button onClick={() => console.log(entityList)}>
        print console
      </Button>
    </div>
  );
}

const useFriendListStyles = makeStyles(theme => ({
  wrapper: {
    width: '100%',
    marginTop: 8,
    height: 200,
    overflow: 'auto',
    border: '1px solid #111',
    padding: 8
  },
  cellWrapper: {
    height: 30,
    borderBottom: '1px solid #c8c8c8',
    display: 'flex',
    flexDirection: 'columm',
    justifyContent: 'center',
    alignItems: 'center',
  }
}));

function FriendList(props) {
  const classes = useFriendListStyles();

  const lowerCasedInputUsername = props.username.toLowerCase();

  const filtered = friends.filter(friend => {
    const lowerCasedName = friend.name.toLowerCase();
    
    if (lowerCasedName.length < lowerCasedInputUsername.length) {
      return false;
    }

    for (let i = 0; i < lowerCasedInputUsername.length; i++) {
      if (lowerCasedName[i] !== lowerCasedInputUsername[i]) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className={classes.wrapper}>
      {filtered.map(friend => 
        <div key={friend.id} className={classes.cellWrapper} onClick={() => props.onClick(friend)}>
          <div>
            {friend.name}
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
