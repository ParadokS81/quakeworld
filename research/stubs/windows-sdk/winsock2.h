/*
 * Minimal winsock2.h stub for libclang extraction on Linux.
 * See windows.h in this directory for usage notes.
 */
#ifndef _WINSOCK2_STUB_H
#define _WINSOCK2_STUB_H

#ifndef _WINDOWS_STUB_H
#include "windows.h"
#endif

typedef unsigned int    u_int;
typedef unsigned short  u_short;
typedef unsigned long   u_long;
typedef unsigned int    SOCKET;
typedef int             socklen_t;

#define INVALID_SOCKET  (SOCKET)(~0u)
#define SOCKET_ERROR    (-1)

/* Address families */
#define AF_UNSPEC       0
#define AF_INET         2
#define AF_INET6        23

/* Socket types */
#define SOCK_STREAM     1
#define SOCK_DGRAM      2
#define SOCK_RAW        3

/* Protocols */
#define IPPROTO_UDP     17
#define IPPROTO_TCP     6
#define IPPROTO_IP      0
#define IPPROTO_IPV6    41

/* Socket options */
#define SOL_SOCKET      0xffff
#define SO_REUSEADDR    0x0004
#define SO_BROADCAST    0x0020
#define SO_SNDBUF       0x1001
#define SO_RCVBUF       0x1002
#define SO_ERROR        0x1007
#define SO_TYPE         0x1008
#define IP_TTL          4
#define IP_MULTICAST_TTL 10
#define IPTOS_LOWDELAY  0x10
#define TCP_NODELAY     0x0001

/* ioctl */
#define FIONBIO         0x8004667eUL
#define FIONREAD        0x4004667fUL

struct in_addr {
    union {
        struct { unsigned char s_b1, s_b2, s_b3, s_b4; } S_un_b;
        struct { unsigned short s_w1, s_w2; } S_un_w;
        unsigned long S_addr;
    } S_un;
#define s_addr S_un.S_addr
};

struct sockaddr {
    unsigned short sa_family;
    char           sa_data[14];
};

struct sockaddr_in {
    short          sin_family;
    unsigned short sin_port;
    struct in_addr sin_addr;
    char           sin_zero[8];
};

struct in6_addr {
    unsigned char s6_addr[16];
};

struct sockaddr_in6 {
    short           sin6_family;
    unsigned short  sin6_port;
    unsigned long   sin6_flowinfo;
    struct in6_addr sin6_addr;
    unsigned long   sin6_scope_id;
};

struct sockaddr_storage {
    short  ss_family;
    char   __ss_pad1[6];
    long long __ss_align;
    char   __ss_pad2[112];
};

struct hostent {
    char  *h_name;
    char **h_aliases;
    short  h_addrtype;
    short  h_length;
    char **h_addr_list;
};

typedef struct WSAData {
    WORD          wVersion;
    WORD          wHighVersion;
    unsigned short iMaxSockets;
    unsigned short iMaxUdpDg;
    char          *lpVendorInfo;
    char          szDescription[257];
    char          szSystemStatus[129];
} WSADATA, *LPWSADATA;

/* WSA error codes */
#define WSAEWOULDBLOCK  10035
#define WSAEINPROGRESS  10036
#define WSAEALREADY     10037
#define WSAENOTSOCK     10038
#define WSAEADDRINUSE   10048
#define WSAECONNRESET   10054
#define WSAECONNREFUSED 10061
#define WSATIMEDOUT     10060

int     WSAStartup(WORD wVersionRequested, WSADATA *lpWSAData);
int     WSACleanup(void);
int     WSAGetLastError(void);
SOCKET  socket(int af, int type, int protocol);
int     bind(SOCKET s, const struct sockaddr *addr, int namelen);
int     closesocket(SOCKET s);
int     connect(SOCKET s, const struct sockaddr *name, int namelen);
int     listen(SOCKET s, int backlog);
SOCKET  accept(SOCKET s, struct sockaddr *addr, int *addrlen);
int     send(SOCKET s, const char *buf, int len, int flags);
int     recv(SOCKET s, char *buf, int len, int flags);
int     sendto(SOCKET s, const char *buf, int len, int flags,
               const struct sockaddr *to, int tolen);
int     recvfrom(SOCKET s, char *buf, int len, int flags,
                 struct sockaddr *from, int *fromlen);
int     setsockopt(SOCKET s, int level, int optname, const char *optval, int optlen);
int     getsockopt(SOCKET s, int level, int optname, char *optval, int *optlen);
int     ioctlsocket(SOCKET s, long cmd, u_long *argp);
int     gethostname(char *name, int namelen);
struct hostent *gethostbyname(const char *name);
unsigned long   inet_addr(const char *cp);
char*           inet_ntoa(struct in_addr in);
unsigned short  htons(unsigned short hostshort);
unsigned long   htonl(unsigned long hostlong);
unsigned short  ntohs(unsigned short netshort);
unsigned long   ntohl(unsigned long netlong);
int             select(int nfds, void *readfds, void *writefds, void *exceptfds, void *timeout);

#endif /* _WINSOCK2_STUB_H */
