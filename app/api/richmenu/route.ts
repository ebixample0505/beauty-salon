import { NextRequest, NextResponse } from 'next/server';

type MenuItem = {
  label: string;
  url: string;
};

type TabData = {
  tabAItems: MenuItem[]; // 6個想定（2段×3列）
  tabBItems: MenuItem[]; // 6個想定（2段×3列）
  tabALabel: string;
  tabBLabel: string;
};

const TAB_BAR_HEIGHT = 250;
const ICON_ROW_HEIGHT = 718; // (1686 - 250) / 2
const COL_WIDTHS = [833, 833, 834]; // 合計2500

export async function POST(req: NextRequest) {
  try {
    const { tabAItems, tabBItems, tabALabel, tabBLabel }: TabData = await req.json();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'NjilBySvWVCa3UMa5T9/PMO7HDPwP9ACKIsQH6LI1OwoX7Z+WQwN1yLN475XRKv4/hIN7v3A2zc2/lQcZitUSK9K8LC2++Ta9II8+76LQQn2UTkr03iASyz9XYLNlfjSjn0BGmypcVqC4/7xErh5mAdB04t89/1O/w1cDnyilFU=';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // STEP 1: 既存エイリアスを削除
    const aliasListRes = await fetch('https://api.line.me/v2/bot/richmenu/alias/list', { headers });
    const aliasListData = await aliasListRes.json();
    if (aliasListData.aliases) {
      for (const alias of aliasListData.aliases) {
        await fetch(
          `https://api.line.me/v2/bot/richmenu/alias/${alias.richMenuAliasId}`,
          { method: 'DELETE', headers }
        );
      }
    }

    // STEP 2: 既存リッチメニューを全削除
    const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers });
    const listData = await listRes.json();
    if (listData.richmenus) {
      for (const menu of listData.richmenus) {
        await fetch(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    // STEP 3: リッチメニューを作成
    // 上部タブバー(2エリア) + 下部アイコン(2段×3列=6エリア)
    const createMenu = async (
      items: MenuItem[],
      menuLabel: string,
      tabALabelText: string,
      tabBLabelText: string
    ): Promise<string> => {
      const areas: unknown[] = [];

      // --- 上部タブバー（常に両方のタブへの導線を配置） ---
      areas.push({
        bounds: { x: 0, y: 0, width: 1250, height: TAB_BAR_HEIGHT },
        action: {
          type: 'richmenuswitch',
          label: tabALabelText,
          richMenuAliasId: 'tab-a',
          data: 'tab=tab-a',
        },
      });
      areas.push({
        bounds: { x: 1250, y: 0, width: 1250, height: TAB_BAR_HEIGHT },
        action: {
          type: 'richmenuswitch',
          label: tabBLabelText,
          richMenuAliasId: 'tab-b',
          data: 'tab=tab-b',
        },
      });

      // --- 下部アイコン 2段×3列 ---
      items.slice(0, 6).forEach((item, i) => {
        const row = Math.floor(i / 3); // 0 or 1
        const col = i % 3; // 0,1,2
        const x = COL_WIDTHS.slice(0, col).reduce((a, b) => a + b, 0);
        areas.push({
          bounds: {
            x,
            y: TAB_BAR_HEIGHT + row * ICON_ROW_HEIGHT,
            width: COL_WIDTHS[col],
            height: ICON_ROW_HEIGHT,
          },
          action: item.url
            ? {
                type: 'uri',
                label: item.label,
                uri: item.url,
              }
            : {
                type: 'message',
                label: item.label,
                text: `${item.label || 'この機能'}は準備中です。もうしばらくお待ちください。`,
              },
        });
      });

      const body = {
        size: { width: 2500, height: 1686 },
        selected: false,
        name: menuLabel,
        chatBarText: menuLabel,
        areas,
      };

      console.log(`${menuLabel} 送信body:`, JSON.stringify(body, null, 2));

      const res = await fetch('https://api.line.me/v2/bot/richmenu', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log(`${menuLabel} 作成結果 (status ${res.status}):`, JSON.stringify(data));

      if (!res.ok || !data.richMenuId) {
        throw new Error(
          `「${menuLabel}」の作成に失敗しました (status ${res.status}): ${JSON.stringify(data)}`
        );
      }

      return data.richMenuId as string;
    };

    const tabAId = await createMenu(tabAItems, tabALabel, tabALabel, tabBLabel);
    const tabBId = await createMenu(tabBItems, tabBLabel, tabALabel, tabBLabel);

    console.log('タブA ID:', tabAId);
    console.log('タブB ID:', tabBId);

    return NextResponse.json({ success: true, tabAId, tabBId });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'NjilBySvWVCa3UMa5T9/PMO7HDPwP9ACKIsQH6LI1OwoX7Z+WQwN1yLN475XRKv4/hIN7v3A2zc2/lQcZitUSK9K8LC2++Ta9II8+76LQQn2UTkr03iASyz9XYLNlfjSjn0BGmypcVqC4/7xErh5mAdB04t89/1O/w1cDnyilFU=';

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const richMenuId = formData.get('richMenuId') as string;
    const tabAId = formData.get('tabAId') as string;
    const tabBId = formData.get('tabBId') as string;
    const isLastUpload = formData.get('isLastUpload') === 'true';

    if (!image || !richMenuId) {
      return NextResponse.json({ error: 'Missing image or richMenuId' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const imageBuffer = await image.arrayBuffer();
    const contentType = image.type || 'image/jpeg';

    const uploadRes = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Authorization': `Bearer ${token}`,
        },
        body: imageBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('画像アップロードエラー:', uploadRes.status, err);
      return NextResponse.json({ error: `画像アップロード失敗 (${uploadRes.status}): ${err}` }, { status: 400 });
    }

    if (isLastUpload && tabAId && tabBId) {
      const aliasARes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers,
        body: JSON.stringify({ richMenuAliasId: 'tab-a', richMenuId: tabAId }),
      });
      const aliasAText = await aliasARes.text();
      console.log('エイリアスA作成:', aliasARes.status, aliasAText);
      if (!aliasARes.ok) {
        return NextResponse.json({ error: `エイリアスA作成失敗: ${aliasAText}` }, { status: 400 });
      }

      const aliasBRes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
        method: 'POST',
        headers,
        body: JSON.stringify({ richMenuAliasId: 'tab-b', richMenuId: tabBId }),
      });
      const aliasBText = await aliasBRes.text();
      console.log('エイリアスB作成:', aliasBRes.status, aliasBText);
      if (!aliasBRes.ok) {
        return NextResponse.json({ error: `エイリアスB作成失敗: ${aliasBText}` }, { status: 400 });
      }

      const setDefaultRes = await fetch(
        `https://api.line.me/v2/bot/user/all/richmenu/${tabAId}`,
        { method: 'POST', headers }
      );
      const setDefaultText = await setDefaultRes.text();
      console.log('デフォルト設定:', setDefaultRes.status, setDefaultText);
      if (!setDefaultRes.ok) {
        return NextResponse.json({ error: `デフォルト設定失敗: ${setDefaultText}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}