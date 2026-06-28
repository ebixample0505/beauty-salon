import { NextRequest, NextResponse } from 'next/server';

type MenuItem = {
  label: string;
  url: string;
};

export async function POST(req: NextRequest) {
  try {
    const { menuItems } = await req.json();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      'NjilBySvWVCa3UMa5T9/PMO7HDPwP9ACKIsQH6LI1OwoX7Z+WQwN1yLN475XRKv4/hIN7v3A2zc2/lQcZitUSK9K8LC2++Ta9II8+76LQQn2UTkr03iASyz9XYLNlfjSjn0BGmypcVqC4/7xErh5mAdB04t89/1O/w1cDnyilFU=';

    console.log('TOKEN:', token ? '設定済み' : 'undefined');

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 500 });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // STEP 1: 既存のリッチメニューを削除
    const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers });
    const listData = await listRes.json();
    console.log('既存メニュー数:', listData.richmenus?.length || 0);

    if (listData.richmenus) {
      for (const menu of listData.richmenus) {
        await fetch(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    // STEP 2: リッチメニューを作成
    const richMenuBody = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Main Menu',
      chatBarText: 'メニュー',
      areas: menuItems.map((item: MenuItem, i: number) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          bounds: {
            x: col * 833,
            y: row * 843,
            width: 833,
            height: 843,
          },
          action: {
            type: 'uri',
            label: item.label,
            uri: item.url,
          },
        };
      }),
    };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers,
      body: JSON.stringify(richMenuBody),
    });

    const createData = await createRes.json();
    console.log('作成結果:', createData);

    if (!createRes.ok) {
      return NextResponse.json({ error: createData.message }, { status: 400 });
    }

    const richMenuId = createData.richMenuId;

    // STEP 3: デフォルトリッチメニューに設定
    const setDefaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: 'POST',
        headers,
      }
    );

    console.log('デフォルト設定結果:', setDefaultRes.status);
    const setDefaultData = await setDefaultRes.text();
    console.log('デフォルト設定レスポンス:', setDefaultData);

    return NextResponse.json({ success: true, richMenuId });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      'NjilBySvWVCa3UMa5T9/PMO7HDPwP9ACKIsQH6LI1OwoX7Z+WQwN1yLN475XRKv4/hIN7v3A2zc2/lQcZitUSK9K8LC2++Ta9II8+76LQQn2UTkr03iASyz9XYLNlfjSjn0BGmypcVqC4/7xErh5mAdB04t89/1O/w1cDnyilFU=';

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const richMenuId = formData.get('richMenuId') as string;

    console.log('画像アップロード richMenuId:', richMenuId);
    console.log('画像タイプ:', image?.type);
    console.log('画像サイズ:', image?.size);

    if (!image || !richMenuId) {
      return NextResponse.json({ error: 'Missing image or richMenuId' }, { status: 400 });
    }

    const imageBuffer = await image.arrayBuffer();
    const contentType = image.type || 'image/jpeg';

    // 画像アップロード
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

    console.log('画像アップロード結果:', uploadRes.status);

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('アップロードエラー:', err);
      return NextResponse.json({ error: err }, { status: 400 });
    }

    // 画像アップロード後にデフォルト設定
    const setDefaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('デフォルト再設定結果:', setDefaultRes.status);
    const setDefaultData = await setDefaultRes.text();
    console.log('デフォルト再設定レスポンス:', setDefaultData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}