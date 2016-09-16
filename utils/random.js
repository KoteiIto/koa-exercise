'use strict';

import _ from 'lodash';

const BASE_STRING_LIST = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

class Random {
    static getString(length = 10, excludeList = []) {
        let list = _.difference(BASE_STRING_LIST, excludeList);
        let listLength = list.length;
        let str = '';
        for(let i = 0; i < length; i++) {
            str += list[Math.floor(Math.random()*listLength)];
        }
        return str;
    }
}

export default Random;