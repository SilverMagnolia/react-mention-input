import React, { useState, useRef } from 'react';
import {
  makeStyles
} from '@material-ui/core';
import InlineElementTextInput from './InlineElementTextInput';
import DetectableElementDescriptors from './DetectableElementDescriptors';
import { usernames, hashtags, communities } from './dummy';

import './App.css';


const useStyles = makeStyles({
  searchResult: {
    marginTop: 32,
    borderTop: '1px solid gray',
  },
  searchResultText: {
    height: 32,
    fontSize: '1rem',
    fontWeight: 'bold',
    borderBottom: '1px solid gray',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingLeft: 8,
    boxSizing: 'border-box'
  },
  input: {
    fontSize: 15,
    width: 300,
  }
});

function App() {
  const classes = useStyles();
  const [entityList, setEntityList] = useState([]);
  const [detectedElem, setDetectedElem] = useState(null);

  const inputRef = useRef();

  // todo: entityList에 char가 아닌 element를 어떻게 삽입할 것인지?
  // option1: useImperativeHandle
  // option2: state에 하이라이트 정보를 담는다? how?

  console.info('😢', detectedElem)

  return (
    <>
      <div>
        <InlineElementTextInput
          ref={inputRef}
          // className={classes.input}
          elementDescriptors={DetectableElementDescriptors}
          entityList={entityList}
          onChange={(newValue) => setEntityList(newValue)}
          onDetectLink={() => { }}
          onDetect={(detectedElem) => {
            setDetectedElem(detectedElem)
          }}
        />
      </div>

      {detectedElem !== null && detectedElem.type === 'mention' &&
        <SearchResultViewer
          list={usernames}
          searchKeyword={detectedElem.value}
          onClick={(value) => {
            inputRef.current.highlightElement({...detectedElem, newValue: value});
          }}
        />
      }

      {detectedElem !== null && detectedElem.type === 'hashtag' &&
        <SearchResultViewer
          list={hashtags}
          searchKeyword={detectedElem.value}
          onClick={(value) => {
            inputRef.current.highlightElement({...detectedElem, newValue: value});
          }}
        />
      }

      {detectedElem !== null && detectedElem.type === 'community' &&
        <SearchResultViewer
          list={communities}
          searchKeyword={detectedElem.value}
          onClick={(value) => {
            inputRef.current.highlightElement({...detectedElem, newValue: value});
          }}
        />
      }
    </>
  );
}

function SearchResultViewer(props) {
  const classes = useStyles();
  const { list, searchKeyword } = props;

  return (
    <div className={classes.searchResult}>
      {list.filter(elem => {
        const idx = elem.toLowerCase().indexOf(searchKeyword.toLowerCase());
        return 0 <= idx;
      }).map((elem, i) =>
        <div 
          key={i} 
          className={classes.searchResultText} 
          onClick={() => props.onClick(elem)}
        >
          {elem}
        </div>
      )}
    </div>
  )
}

export default App;
