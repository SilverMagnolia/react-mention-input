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

  // todo: 인덱스 맞추기 어렵다면 맞출 필요가 없도록 데이터를 모델링해볼까?
  const [entityList, setEntityList] = useState([]);

  const textAreaInput = useRef();
  const mentionShadowRef = useRef();
  const lastSelectionInfo = useRef(new SelectionInfo(0, 0));

  const intermediateEntityList = entityList
    .flatMap((entity, index) => {
      if (entity.type === EntityType.char) {
        return {value: entity.value, index};
      } else /* mention */ {
        const charArr = entity.value.name.split('');
        return charArr.map(char => ({value: char, index}));
      }
    });
  
  const plainText = intermediateEntityList
    .map(e => e.value)
    .join('');

  const mentionShadowHtml = entityList.map(entity => {
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

    return entityList[intermediateEntityList[strIndex].index];
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
            const newValue = e.target.value;
            // mentionShadowRef.current.scrollHeight = e.target.scrollHeight; 

            // console.info('🤡scrollTop: ', e.target.scrollTop)
            // console.info('😈offsetHeight(textarea): ', e.target.offsetHeight)
            // console.info('😈offsetHeight(mentionShadow): ', mentionShadowRef.current.offsetHeight)

            const diffResult = dmp.diff_main(plainText, newValue);

            let curIndex = 0;
            diffResult.forEach(diff => {
              const diffType = diff[0];
              const value = diff[1];

              switch (diffType) {
                case DiffMatchPatch.DIFF_EQUAL:
                  // console.log('👍equal');
                  curIndex += value.length;
                  break;

                case DiffMatchPatch.DIFF_INSERT:
                  // console.log('🤘insert');

                  for (let i = 0; i < value.length; i++) {

                    if (intermediateEntityList.length === 0) {
                      entityList.splice(0, 0, new TextEntity(EntityType.char, value[i]));
                    } else {
                      const insertIndex = intermediateEntityList[curIndex - 1].index + i + 1;
                      entityList.splice(insertIndex, 0, new TextEntity(EntityType.char, value[i]));
                    }

                  }
                  curIndex += value.length;
                  break;

                case DiffMatchPatch.DIFF_DELETE:
                  // console.log('🤟delete');
                  
                  // console.log('====================================');
                  // console.info('😈curIndex:', curIndex);
                  // console.info('🦋', intermediateEntityList);
                  
                  for (let i = 0; i < value.length; i++) {
                    if (curIndex === 0) {
                      entityList.splice(0, 1);
                    } else {
                      const deleteIndex = intermediateEntityList[curIndex - 1].index + 1;
                      // console.info('👅', deleteIndex);

                      if (entityList[deleteIndex - 1].type === EntityType.mention) {
                        entityList.splice(deleteIndex - 1, 1);
                      } else {
                        entityList.splice(deleteIndex, 1);
                      }
                    }
                  }

                  break;
                default:
                  break;
              }
            });

            
            setEntityList([...entityList]);
          }}
          
          onSelect={() => {
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

            if (isCursorPositionBeforeEndOfString === true) {
              const entityObjAtSelectionStart = getEntityObjByStringIndex(selectionStart);
              const entityObjRightBeforeAtSelectionStart = getEntityObjByStringIndex(selectionStart - 1);

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
              const entityObjRightBeforeAtSelectionStart = getEntityObjByStringIndex(selectionStart - 1);

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
          }}
        />


      </div>

      {tempMentionUsername !== null &&
        <FriendList 
          onClick={(friend) => {
            friend.name += '\u200B\u200B';

            const selectionStart = lastSelectionInfo.current.start;
            const tempMentionLastIndex = intermediateEntityList[selectionStart - 1].index;
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
