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
  insertText: {
    border: '1px solid #000'
  },
  mentionShadow: {
    border: '1px solid #f00',
    padding: '18.5px 14px',
    fontSize: '1rem',
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontWeight: 400,
    lineHeight: '1.1875em',
    letterSpacing: '0.00938em',

    color: 'transparent',
    
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    textAlign: 'start'
  },
  mentionHighlight: {
    backgroundColor: '#d8dfea'
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
  const [entityList, setEntityList] = useState([]);

  const textAreaInput = useRef();
  const lastSelectionInfo = useRef(new SelectionInfo(0, 0));

  const plainText = entityList
    .map(e => {
      if (e.type === EntityType.char) {
        return e.value;
      } else if (e.type === EntityType.mention) {
        return e.value.name
      } else {
        return '';
      }
    })
    .join('');

  function getEntityObjByStringIndex(strIndex) {
    if (plainText.length === entityList.length) {
      return entityList[strIndex];
    }

    let i = 0;
    let c = 0; // 루프 돌면서 mention obj 만나면 mention name의 length - 1을 누적해서 더함. 

    while(i < entityList.length) {
      if (entityList[i].type === EntityType.char) {
        if (i ===  strIndex - c) {
          return entityList[i];
        }
      
      } else if (entityList[i].type === EntityType.mention) {
        const curEntityLength = entityList[i].length;
        const mentionStartIdx = i + c;
        const mentionEndIdx = i + curEntityLength + c;

        if (mentionStartIdx <= strIndex && strIndex < mentionEndIdx) {
          return entityList[i];

        } else {
          c += (curEntityLength - 1);                                                           
        }
      } 

      i++;
    }

    return null;
  }

   function getEntityIndexByStringIndex(strIndex) {
    if (plainText.length === entityList.length) {
      return strIndex;
    }

    let i = 0;
    let c = 0; // 루프 돌면서 mention obj 만나면 mention name의 length - 1을 누적해서 더함. 

    while(i < entityList.length) {
      if (entityList[i].type === EntityType.char) {
        if (i ===  strIndex - c) {
          return i;
        }
      
      } else if (entityList[i].type === EntityType.mention) {
        const curEntityLength = entityList[i].length;
        const mentionStartIdx = i + c;
        const mentionEndIdx = i + curEntityLength + c;

        if (mentionStartIdx <= strIndex && strIndex < mentionEndIdx) {
          return i;

        } else {
          c += (curEntityLength - 1);                                                           
        }
      } 

      i++;
    }

    return null;
  }

  return (
    <div className="App">
      <div style={{fontSize: 20, fontWeight: 'bold', color: 'red', height: 100}}>
        {tempMentionUsername || 'null'}
      </div>

      <div className={classes.wrapper}>

        <TextField
          inputRef={textAreaInput}
          label='description'
          variant="outlined"
          fullWidth 
          multiline
          rowsMax={10}
          inputProps={{
            spellCheck: false
          }}
          value={plainText}
          onChange={(e) => {
            const newValue = e.target.value;

            console.time("diff");
            const diffResult = dmp.diff_main(plainText, newValue);

            let curLength = 0;
            diffResult.forEach(diff => {
              const diffType = diff[0];
              const value = diff[1];

              switch (diffType) {
                case DiffMatchPatch.DIFF_EQUAL:
                  // console.log('👍equal');
                  curLength += value.length;
                  break;

                case DiffMatchPatch.DIFF_INSERT:
                  // console.log('🤘insert');
                  for (let i = 0; i < value.length; i++) {
                    entityList.splice(curLength + i, 0, new TextEntity(EntityType.char, value[i]));
                  }
                  curLength += value.length;
                  break;

                case DiffMatchPatch.DIFF_DELETE:
                  // console.log('🤟delete');
                  for (let i = 0; i < value.length; i++) {
                    entityList.splice(curLength, 1);
                  }

                  break;
                default:
                  break;
              }
            });

            console.timeEnd("diff");
            setEntityList([...entityList]);
          }}
          
          onSelect={() => {
            // cursor 위치 변경 및 셀렉션 레인지 변경 시 항시 호출됨.

            // console.log(`===========\n🦊on select`);
            // console.log(`start: ${textAreaInput.current.selectionStart}`);
            // console.log(`end: ${textAreaInput.current.selectionEnd}`);

            // todo: entityList에 인덱스로 접근할 때 mention type의 length를 고려

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

            if (selectionStart !== selectionEnd || selectionStart === 0) {
              setNull();
              return;
            }  

            const isCursorPositionBeforeEndOfString = selectionStart < entityList.length;
            const entityObjAtSelectionStart = getEntityObjByStringIndex(selectionStart);
            const entityObjRightBeforeAtSelectionStart = getEntityObjByStringIndex(selectionStart - 1);

            if (isCursorPositionBeforeEndOfString === true) {
              const isVeryNextCharWhiteSpace = 
                entityObjAtSelectionStart.type === EntityType.char 
                && (entityObjAtSelectionStart.value === ' ' || entityObjAtSelectionStart.value === '\n');

              const isCurrentCharNewLine = 
                entityObjAtSelectionStart.type === EntityType.char 
                && entityObjRightBeforeAtSelectionStart.value === '\n';

              if (isVeryNextCharWhiteSpace === false || isCurrentCharNewLine === true) {
                setNull();
                return;
              }

            } else {
              // cursor is at end of string
              const isLastCharNewLine = 
                entityObjRightBeforeAtSelectionStart.type === EntityType.char 
                && entityObjRightBeforeAtSelectionStart.value === '\n';

              if (isLastCharNewLine === true) {
                setNull();
                return;
              }
            }

            const maxLengthOfUsername = 64;
            let curTempMentionUsername = '';

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

            // 현재 커서 위치에서 최대 맥스 length 까지 뒤로 가면서 @가 있나 체크.
            // 있으면 반복을 거기서 중단하고 @와 현재 커서 사이에 있는 스트링을 추출, 친구 검색.

            // @가 없거나, 맥스 length만큼 돌기 전에 인덱스가 0이 되거나, 중간에 char type이 아닌 원소를 만나면
            // 그대로 함수 리턴.
          }}
        />
      </div>

      {tempMentionUsername !== null &&
        <FriendList 
          onClick={(friend) => {
            const selectionStart = lastSelectionInfo.current.start;
            const entityIndex = getEntityIndexByStringIndex(selectionStart);
            console.info('🤢', selectionStart);
            console.info('🐽', entityIndex);
            entityList.splice(entityIndex - tempMentionUsername.length - 1, tempMentionUsername.length + 1);
            entityList.splice(entityIndex - tempMentionUsername.length - 1, 0, new TextEntity(EntityType.mention, friend));
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
