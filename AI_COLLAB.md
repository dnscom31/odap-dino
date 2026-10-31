# AI 협업 방법 (Claude + Gemini 아르곤)

이 저장소는 Jun이 기획하고, **Claude가 코드를 작성**하고, **Gemini 아르곤이 검토와 의견**을 주는 방식으로 진행합니다.

## 역할

| 누구 | 하는 일 | 저장소 접근 |
| --- | --- | --- |
| Jun | 방향 결정, 두 AI 사이 전달 | 소유자 |
| Claude | 코드 작성, PR 생성, 문서 정리 | 읽기·쓰기 |
| Gemini 아르곤 | 기획·코드 검토, 아이디어 제안 | 공개 저장소 읽기만 (채팅) |

## 소통 순서

Gemini 아르곤은 채팅만 가능하고 저장소에 직접 쓰지 못하므로, Jun이 중간에서 전달합니다.

1. Claude가 작업을 PR로 올리고, `docs/ai-chat/LOG.md`에 **Gemini에게 묻고 싶은 질문**을 적습니다.
2. Jun이 아래 "Gemini에게 보낼 시작 메시지"를 Gemini 채팅에 붙여 넣습니다.
3. Gemini의 답변을 Jun이 Claude 채팅에 그대로 붙여 넣습니다.
4. Claude가 답변을 `docs/ai-chat/LOG.md`에 기록하고, 받아들일 의견은 코드나 `docs/DECISIONS.md`에 반영합니다.

결정권은 항상 Jun에게 있습니다. 두 AI 의견이 다르면 차이점을 정리해 Jun에게 묻습니다.

## Gemini에게 보낼 시작 메시지

아래 내용을 그대로 복사해서 Gemini 아르곤에게 보내세요.

```
너는 "오답 공룡" 앱 프로젝트의 검토자야. 코드는 Claude가 작성하고, 너는 검토와 의견을 맡아.
아래 공개 저장소의 파일을 읽어줘.

- 기획서: https://github.com/dnscom31/odap-dino/blob/main/docs/PLAN.md
- 결정 사항: https://github.com/dnscom31/odap-dino/blob/main/docs/DECISIONS.md
- AI 대화 기록: https://github.com/dnscom31/odap-dino/blob/main/docs/ai-chat/LOG.md

LOG.md 맨 아래 "Gemini에게 묻는 질문"에 답해줘.
답변은 아래 형식으로 써줘. 나는 코딩을 모르니까 쉬운 말로 설명해줘.

## Gemini 답변 (날짜)
- 질문 1에 대한 답:
- 질문 2에 대한 답:
- 추가 의견:
```

## 규칙

- 저장소는 공개이므로 **비밀번호, API 키, 학생 개인정보는 절대 올리지 않습니다.**
- Gemini의 답변은 사실 확인 없이 그대로 코드에 넣지 않습니다. Claude가 검토 후 반영합니다.
