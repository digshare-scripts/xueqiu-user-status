import {script} from '@digshare/script';
import * as Cheerio from 'cheerio';
import fetch from 'node-fetch';

const USER_URL = 'https://xueqiu.com/u/3690450104';

interface Payload {}

interface Storage {
  pushed: string[];
}

export default script<Payload, Storage>(async (_payload, {storage}) => {
  let html = await fetch(USER_URL, {
    headers: {
      'User-Agent': 'Googlebot',
    },
  }).then(response => response.text());

  let $ = Cheerio.load(html);

  let pushedSet = new Set(storage.getItem('pushed'));

  let user = $('h1').text();

  let statuses = $('.list > .content')
    .toArray()
    .map(content => {
      let href = $('a', content).attr('href');
      let status = $('p:last-child', content).text();

      if (typeof href !== 'string' || !/^\/\d+\/\d+$/.test(href)) {
        return undefined;
      }

      return {
        href,
        status,
      };
    })
    .filter(
      (status): status is NonNullable<typeof status> =>
        !!status && !pushedSet.has(status.href),
    );

  if (statuses.length === 0) {
    console.info('没有发布新状态。');
    return undefined;
  }

  storage.setItem(
    'pushed',
    [...pushedSet, ...statuses.map(status => status.href)].slice(-100),
  );

  return {
    content: `\
${user} 发布了新的状态：
${statuses[0].status}`,
    links: [USER_URL],
  };
});
